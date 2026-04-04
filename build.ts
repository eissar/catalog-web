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

// Read all .md files from the catalog source
let fileCount = 0;
// Collect markdown entries
const entries = [];
for await (const entry of Deno.readDir(CATALOG_DIR)) {
  if (entry.isFile && entry.name.endsWith(".md")) {
    entries.push(entry);
  }
}
// Copy files in parallel using Promise.all
await Promise.all(entries.map(async (entry) => {
  const srcPath = `${CATALOG_DIR}/${entry.name}`;
  const destPath = `${CONTENT_CATALOG_DIR}/${entry.name}`;
  const content = await Deno.readFile(srcPath);
  await Deno.writeFile(destPath, content);
  console.log(`  Synced: ${entry.name}`);
}));
fileCount = entries.length;

console.log(`Synced ${fileCount} files`);

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
    "lume/cli.ts"
  ],
  stdout: "inherit",
  stderr: "inherit",
});
const buildResult = await deno.spawn().status;
if (!buildResult.success) {
  Deno.exit(buildResult.code);
}
console.log("Build complete!");
