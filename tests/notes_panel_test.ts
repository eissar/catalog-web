/**
 * Test for the notes panel fix
 * Run with: deno test --allow-net --allow-read --allow-write --allow-env tests/notes_panel_test.ts
 */

import { assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";

function parseNoteFilename(filename: string): { name: string; category: string } | null {
  if (!filename.endsWith(".md")) {
    return null;
  }
  const base = filename.replace(/\.md$/, "");
  const parts = base.split(".");
  if (parts.length < 2) {
    return { name: base, category: "uncategorized" };
  }
  const category = parts.pop()!;
  const name = parts.join(".");
  return { name, category };
}

Deno.test("parseNoteFilename — only processes .md files", () => {
  assertEquals(parseNoteFilename("test.philosophy.md"), { name: "test", category: "philosophy" });
  assertEquals(parseNoteFilename("automation.map.md"), { name: "automation", category: "map" });
  assertEquals(parseNoteFilename("index.njk"), null);
  assertEquals(parseNoteFilename("style.css"), null);
});

Deno.test("parseNoteFilename — handles uncategorized notes", () => {
  assertEquals(parseNoteFilename("empathy-machine.md"), { name: "empathy-machine", category: "uncategorized" });
});

Deno.test("parseNoteFilename — handles dots in name", () => {
  assertEquals(parseNoteFilename("john-locke-indexing.commonplacing.md"), { name: "john-locke-indexing", category: "commonplacing" });
});
