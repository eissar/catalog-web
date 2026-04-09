// build.ts - ensure catalog repo is present, sync files into content/, then run the Lume build
// Usage: deno run --allow-env --allow-read --allow-write --allow-run --allow-net build.ts

const CATALOG_DIR = Deno.env.get("CATALOG_DIR") ?? "./catalog";
const CONTENT_CATALOG_DIR = "./content/catalog";

/**
 * Get Git creation and modification dates for a file
 */
async function getGitDates(repoPath: string, filename: string): Promise<{ created: string; modified: string }> {
  try {
    // Get creation date (first commit)
    const createdCmd = new Deno.Command("git", {
      args: ["log", "--reverse", "--pretty=format:%ad", "--date=iso", "--", filename],
      cwd: repoPath,
      stdout: "piped",
      stderr: "piped",
    });
    const createdResult = await createdCmd.output();
    const createdOutput = new TextDecoder().decode(createdResult.stdout).trim();
    const createdDate = createdOutput.split('\n')[0] || new Date().toISOString();
    
    // Get modification date (last commit)
    const modifiedCmd = new Deno.Command("git", {
      args: ["log", "-1", "--pretty=format:%ad", "--date=iso", "--", filename],
      cwd: repoPath,
      stdout: "piped",
      stderr: "piped",
    });
    const modifiedResult = await modifiedCmd.output();
    const modifiedOutput = new TextDecoder().decode(modifiedResult.stdout).trim();
    const modifiedDate = modifiedOutput || new Date().toISOString();
    
    return {
      created: createdDate,
      modified: modifiedDate
    };
  } catch (error) {
    console.warn(`Failed to get Git dates for ${filename}:`, error);
    // Fallback to current date if Git fails
    const now = new Date().toISOString();
    return {
      created: now,
      modified: now
    };
  }
}

// Ensure catalog directory exists; clone if missing
try {
  const stat = await Deno.stat(CATALOG_DIR);
  if (!stat.isDirectory) {
    console.error(`Error: ${CATALOG_DIR} is not a directory`);
    Deno.exit(1);
  }
} catch {
  console.log(`Catalog not found — cloning into ${CATALOG_DIR}...`);
  const git = new Deno.Command("git", {
    args: ["clone", "https://github.com/eissar/catalog", CATALOG_DIR],
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await git.output();
  if (code !== 0) {
    console.error("Clone failed:", new TextDecoder().decode(stderr));
    Deno.exit(code);
  }
  console.log("Clone successful!");
}

// Sync catalog .md files into content/catalog/ so Lume can process them.
// Lume's src is "./content", so files outside content/ are invisible to it.
console.log(`Syncing ${CATALOG_DIR} → ${CONTENT_CATALOG_DIR} ...`);

// Ensure content/catalog/ exists
await Deno.mkdir(CONTENT_CATALOG_DIR, { recursive: true });

// Clean up any existing files/symlinks in content/catalog/
for await (const entry of Deno.readDir(CONTENT_CATALOG_DIR)) {
  const filePath = `${CONTENT_CATALOG_DIR}/${entry.name}`;
  await Deno.remove(filePath);
}

// Read all .md files from the catalog source
const entries: { name: string; isFile: boolean }[] = [];
for await (const entry of Deno.readDir(CATALOG_DIR)) {
  if (entry.isFile && entry.name.endsWith(".md")) {
    entries.push({ name: entry.name, isFile: entry.isFile });
  }
}

// Copy files in parallel using Promise.all
await Promise.all(
  entries.map(async (entry) => {
    const srcPath = `${CATALOG_DIR}/${entry.name}`;
    const destPath = `${CONTENT_CATALOG_DIR}/${entry.name}`;
    let content = await Deno.readTextFile(srcPath);

    // Fix date format issues in front matter
    content = content.replace(/date:\s*"([^"]+)"/g, "date: $1");
    content = content.replace(/lastmod:\s*"([^"]+)"/g, "lastmod: $1");

    // Get Git dates for the file
    const gitDates = await getGitDates(CATALOG_DIR, entry.name);
    
    // Inject layout frontmatter if not present
    if (!content.includes("layout:")) {
      // Check if file already has frontmatter
      if (content.startsWith("---")) {
        // Add layout and Git dates to existing frontmatter
        let frontmatterEnd = content.indexOf("\n---", 3);
        if (frontmatterEnd === -1) {
          frontmatterEnd = content.indexOf("\n---\n", 3);
        }
        
        if (frontmatterEnd !== -1) {
          const before = content.substring(0, frontmatterEnd);
          const after = content.substring(frontmatterEnd);
          content = `${before}\nlayout: default.njk\ngitCreated: "${gitDates.created}"\ngitModified: "${gitDates.modified}"${after}`;
        } else {
          // Fallback if frontmatter parsing fails
          content = `---\nlayout: default.njk\ngitCreated: "${gitDates.created}"\ngitModified: "${gitDates.modified}"\n---\n\n${content}`;
        }
      } else {
        // Add frontmatter with layout and Git dates
        content = `---\nlayout: default.njk\ngitCreated: "${gitDates.created}"\ngitModified: "${gitDates.modified}"\n---\n\n${content}`;
      }
    } else {
      // File already has layout, just add Git dates to existing frontmatter
      if (content.startsWith("---")) {
        let frontmatterEnd = content.indexOf("\n---", 3);
        if (frontmatterEnd === -1) {
          frontmatterEnd = content.indexOf("\n---\n", 3);
        }
        
        if (frontmatterEnd !== -1) {
          const before = content.substring(0, frontmatterEnd);
          const after = content.substring(frontmatterEnd);
          content = `${before}\ngitCreated: "${gitDates.created}"\ngitModified: "${gitDates.modified}"${after}`;
        }
      }
    }

    // Copy the file
    await Deno.writeTextFile(destPath, content);
    console.log(`  Synced: ${entry.name}`);
  }),
);

const fileCount = entries.length;
console.log(`Synced ${fileCount} files`);

// Assert that at least one file exists in the catalog directory
if (fileCount === 0) {
  console.error(`Error: No files found in ${CATALOG_DIR}`);
  Deno.exit(1);
}

// Ensure at least one copied file resides in a catalog path
const catalogFiles = entries.filter((entry) => `${CONTENT_CATALOG_DIR}/${entry.name}`.includes("/catalog"));
if (catalogFiles.length === 0) {
  console.error('Error: No copied files contain "/catalog" in their path.');
  Deno.exit(1);
}

// Run Lume build
console.log(`Building site...`);
const deno = new Deno.Command(Deno.execPath(), {
  args: [
    "run",
    "--allow-env",
    "--allow-read",
    "--allow-write",
    "--allow-run",
    "--allow-net",
    "--allow-sys",
    "lume/cli.ts",
  ],
  stdout: "inherit",
  stderr: "inherit",
});
const buildResult = await deno.spawn().status;
if (!buildResult.success) {
  Deno.exit(buildResult.code);
}
console.log("Build complete!");
