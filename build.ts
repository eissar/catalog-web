// build.ts - script to index catalog files into Lume site
// Usage: deno run --allow-env --allow-read --allow-write --allow-run build.ts

// Ensure required permissions are granted in deno.json (env, read, write, run)

const CATALOG_DIR = Deno.env.get("CATALOG_DIR");
if (!CATALOG_DIR) {
  console.error("Error: Environment variable CATALOG_DIR is not set.");
  Deno.exit(1);
}

// Verify that the catalog directory exists
try {
  const stat = await Deno.stat(CATALOG_DIR);
  if (!stat.isDirectory) {
    console.error(`Error: CATALOG_DIR (${CATALOG_DIR}) is not a directory.`);
    Deno.exit(1);
  }
} catch (e) {
  console.error(`Error: Unable to access CATALOG_DIR (${CATALOG_DIR}): ${e.message}`);
  Deno.exit(1);
}

const CONTENT_DIR = "./content";
// Ensure content directory exists
await Deno.mkdir(CONTENT_DIR, { recursive: true });

// Recursively copy files from catalog to content
async function copyRecursive(src: string, dest: string) {
  for await (const entry of Deno.readDir(src)) {
    const srcPath = `${src}/${entry.name}`;
    const destPath = `${dest}/${entry.name}`;
    if (entry.isFile) {
      await Deno.copyFile(srcPath, destPath);
    } else if (entry.isDirectory) {
      await Deno.mkdir(destPath, { recursive: true });
      await copyRecursive(srcPath, destPath);
    }
  }
}

await copyRecursive(CATALOG_DIR, CONTENT_DIR);

console.log(`Successfully copied catalog files from ${CATALOG_DIR} to ${CONTENT_DIR}`);

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
