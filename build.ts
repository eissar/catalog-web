// build.ts - ensure catalog repo is present, sync files into content/, then run the Lume build
// Usage: deno run --allow-env --allow-read --allow-write --allow-run --allow-net build.ts

const CATALOG_DIR = Deno.env.get("CATALOG_DIR") ?? "./catalog";
const CONTENT_CATALOG_DIR = "./content/catalog";

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

    // Inject layout frontmatter if not present
    if (!content.includes("layout:")) {
      // Check if file already has frontmatter
      if (content.startsWith("---")) {
        // Add layout to existing frontmatter
        content = content.replace(/^---\s*\n/, "---\nlayout: default.njk\n");
      } else {
        // Add frontmatter with layout
        content = `---\nlayout: default.njk\n---\n\n${content}`;
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
