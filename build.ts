// build.ts - script to index catalog files into Lume site
// Usage: deno run --allow-env --allow-read --allow-write --allow-run build.ts

// Ensure required permissions are granted in deno.json (env, read, write, run)

let CATALOG_DIR = Deno.env.get("CATALOG_DIR");
if (!CATALOG_DIR) {
  // Default to ./catalog if environment variable not provided
  CATALOG_DIR = "./catalog";
  console.log(`CATALOG_DIR not set, defaulting to ${CATALOG_DIR}`);
}

// Ensure the catalog directory exists; if not, clone the repository
try {
  const stat = await Deno.stat(CATALOG_DIR);
  if (!stat.isDirectory) {
    console.error(`Error: CATALOG_DIR (${CATALOG_DIR}) is not a directory.`);
    Deno.exit(1);
  }
} catch (e) {
  console.log(`Catalog directory not found. Cloning repository into ${CATALOG_DIR}...`);
  const cloneCmd = new Deno.Command("git", {
    args: ["clone", "https://github.com/eissar/catalog", CATALOG_DIR],
    cwd: Deno.cwd(),
    stdout: "piped",
    stderr: "piped",
  });
  const { status } = await cloneCmd.spawn().status();
  if (!status.success) {
    console.error("Failed to clone catalog repository");
    Deno.exit(status.code);
  }
}

// const CONTENT_DIR = "./content";
// Since Lume is configured to use the 'catalog' directory as its source (src),
// we no longer need to copy files to a separate 'content' folder.
// The build script now simply runs the Lume build task.
console.log(`Using catalog directory ${CATALOG_DIR} as the Lume source`);

// Run Lume build task
const cmd = new Deno.Command("deno", {
  args: ["task", "build"],
  cwd: Deno.cwd(),
  stdout: "piped",
  stderr: "piped",
});
const { stdout, stderr, status } = await cmd.spawn().output();
if (status.success) {
  console.log(new TextDecoder().decode(stdout));
} else {
  console.error("Lume build failed:");
  console.error(new TextDecoder().decode(stderr));
  Deno.exit(status.code);
}
