// To run this test, use the following command:
// ~/.deno/bin/deno test --allow-net --allow-run --allow-read --allow-write
import { assert, assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";

Deno.test("http server returns catalog notes and links", async () => {
  // Start the Lume dev server on port 3003 using Deno.Command (compatible with newer Deno versions)
  const cmd = new Deno.Command("/home/eissar/.deno/bin/deno", {
    args: ["run", "--allow-net", "--allow-run", "--allow-read", "--allow-write", "-P=lume", "lume/cli.ts", "-s", "-p", "3003"],
    stdout: "inherit",
    stderr: "inherit",
  });
  const server = cmd.spawn();

  // Give the server time to start (adjusted wait)
  await new Promise((r) => setTimeout(r, 5000));

  try {
    const resp = await fetch("http://localhost:3003");
    const text = await resp.text();
    console.log("Response status:", resp.status);
    console.log("Response length:", text.length);
    // Verify that the response contains a known catalog note title
    assert(text.includes("Example Page"), "Response does not contain expected catalog note");

    // Extract all <a> tags from the response
    const aTagRegex = /<a\b[^>]*>(.*?)<\/a>/gi;
    const aTags: string[] = [];
    let match;
    while ((match = aTagRegex.exec(text)) !== null) {
      aTags.push(match[0]);
    }
    // Expect at least one link (the page itself)
    assert(aTags.length > 0, "No <a> tags found in the response");
    // Verify that the link points to the example page
    const hasExampleLink = aTags.some(tag => tag.includes("example-page.html") || tag.includes("example-page"));
    assert(hasExampleLink, "Expected link to example-page not found");
  } finally {
    // Ensure the server process is terminated
    try {
      server.kill("SIGTERM");
    } catch (_) {
      // ignore if already terminated
    }
  }
});
