// To run this test, use the following command:
// ~/.deno/bin/deno test --allow-net --allow-run --allow-read --allow-write
import { assert } from "https://deno.land/std@0.224.0/testing/asserts.ts";

Deno.test("http server returns catalog notes", async () => {
  // Start the Lume dev server on port 3003 using Deno.Command (compatible with newer Deno versions)
  const cmd = new Deno.Command("deno", {
    args: ["task", "serve"],
    stdout: "inherit",
    stderr: "inherit",
  });
  const server = cmd.spawn();

  // Give the server time to start
  await new Promise((r) => setTimeout(r, 10000));

  try {
    const resp = await fetch("http://localhost:3000");
    const text = await resp.text();
    console.log("Response status:", resp.status);
    console.log("Response length:", text.length);
    // Verify that the response contains a known catalog note title
    assert(text.includes("Example Page"), "Response does not contain expected catalog note");
  } finally {
    // Ensure the server process is terminated
    server.kill("SIGTERM");
  }
});
