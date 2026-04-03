// build.ts - ensure catalog repo is present, sync files into content/, then run the Lume build
// Usage: deno run --allow-env --allow-read --allow-write --allow-run build.ts

const CATALOG_DIR = Deno.env.get("CATALOG_DIR") ?? "./catalog";
const CONTENT_CATALOG_DIR = "./content/catalog";

async function run(args: string[], opts?: Deno.CommandOptions): Promise<Deno.CommandOutput> {
  return new Deno.Command(args[0], { ...opts, args: args.slice(1) }).spawn().output();
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
  const { stderr, status } = await run(["git", "clone", "https://github.com/eissar/catalog", CATALOG_DIR]);
  if (!status.success) {
    console.error("Clone failed:", new TextDecoder().decode(stderr));
    Deno.exit(status.code);
  }
}

// Sync catalog .md files into content/catalog/ so Lume can process them.
// Lume's src is "./content", so files outside content/ are invisible to it.
console.log(`Syncing ${CATALOG_DIR} → ${CONTENT_CATALOG_DIR} ...`);

// Ensure content/catalog/ exists
await Deno.mkdir(CONTENT_CATALOG_DIR, { recursive: true });

// Read all .md files from the catalog source
for await (const entry of Deno.readDir(CATALOG_DIR)) {
  if (!entry.isFile || !entry.name.endsWith(".md")) continue;

  const srcPath = `${CATALOG_DIR}/${entry.name}`;
  const destPath = `${CONTENT_CATALOG_DIR}/${entry.name}`;

  // Copy file into content/catalog/
  const content = await Deno.readFile(srcPath);
  await Deno.writeFile(destPath, content);
  console.log(`  Synced: ${entry.name}`);
}

console.log(`Building from ${CONTENT_CATALOG_DIR} ...`);

// Run Lume build
const { stdout, stderr, status } = await run(["deno", "task", "build"]);
if (status.success) {
  console.log(new TextDecoder().decode(stdout));
} else {
  console.error("Build failed:", new TextDecoder().decode(stderr));
  Deno.exit(status.code);
}
