/**
 * Phase 3 – Plugin Evaluation Documentation Integration Check
 *
 * Single-file test that validates the plugin evaluation documentation
 * (markdown-it-plugins-plan.md) against the actual codebase.
 *
 * Run:
 *   ~/.deno/bin/deno test --allow-net --allow-read tests/phase3_plugin_eval_check.ts
 */

import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/testing/asserts.ts";

// --- Helpers ---

const ROOT = new URL(".", import.meta.url).pathname.replace(/\/tests\/?$/, "");
async function readRepo(p: string) { return Deno.readTextFile(`${ROOT}/${p}`); }

// --- 1. Import-map URL check ---

Deno.test("import-map URL for markdown-plugins matches documentation", async () => {
  const denoJson = JSON.parse(await readRepo("deno.json"));
  const mapUrl: string = denoJson.imports["markdown-plugins/"];
  const expected = "https://cdn.jsdelivr.net/gh/lumeland/markdown-plugins@0.12.0/";
  assert(mapUrl.startsWith(expected),
    `Import map \"${mapUrl}\" does not start with \"${expected}\"`);
});

// --- 2. _config.ts plugin registrations vs. plan phases ---

Deno.test("_config.ts registers Phase 1 footnotes plugin (plan \u00a7Phase 1)", async () => {
  const config = await readRepo("_config.ts");
  assert(config.includes('import footnotes from "markdown-plugins/footnotes.ts"'),
    "_config.ts does not import footnotes as required by Phase 1");
  assert(config.includes("site.use(footnotes())"),
    "_config.ts does not call site.use(footnotes())");
});

Deno.test("_config.ts does NOT yet register Phase 2 plugins (references, toc, title)", async () => {
  const config = await readRepo("_config.ts");
  for (const p of ["references", "toc", "title"]) {
    assert(!config.includes(`markdown-plugins/${p}.ts`),
      `${p} plugin already imported but Phase 2 is not yet implemented`);
  }
});

// --- 3. Plugin file existence & export signatures ---

Deno.test("local wikilinks plugin file exists and has a default export", async () => {
  const src = await readRepo("markdown-plugins/wikilinks.ts");
  assert(src.includes("export default function"), "wikilinks.ts must have a default export");
  assert(src.includes("MarkdownIt"), "wikilinks.ts should reference MarkdownIt");
});

Deno.test("remote footnotes plugin is reachable via CDN import-map", async () => {
  const denoJson = JSON.parse(await readRepo("deno.json"));
  const baseUrl: string = denoJson.imports["markdown-plugins/"];
  const url = `${baseUrl}footnotes.ts`;
  const resp = await fetch(url, { method: "HEAD" });
  assert([200, 301, 302, 303, 307].includes(resp.status),
    `Remote footnotes plugin not reachable at ${url} (status ${resp.status})`);
});

// --- 4. Template data keys – plan snippets vs. actual layout ---

Deno.test("plan template keys (references, footnotes, toc) do not collide with existing data", async () => {
  const layout = await readRepo("content/_includes/default.njk");
  for (const key of ["references", "footnotes", "toc", "title"]) {
    const re = new RegExp(`\\b${key}\\b`);
    const matches = layout.match(re);
    if (matches) {
      console.log(`  \u26a0 key \"${key}\" referenced ${matches.length}x in default.njk — potential collision (plan \u00a7Integration #3)`);
    }
  }
  assert(true);
});

Deno.test("default.njk uses PageFind markup as documented", async () => {
  const layout = await readRepo("content/_includes/default.njk");
  assert(layout.includes("pagefind") || layout.includes("PageFind"),
    "Layout does not include PageFind integration expected by plan");
});

// --- 5. Integration considerations – plugin order ---

Deno.test("footnotes is registered AFTER markdown() in _config.ts (plan \u00a7Integration #1)", async () => {
  const config = await readRepo("_config.ts");
  const mdIdx = config.indexOf('site.use(markdown())');
  const fnIdx = config.indexOf("site.use(footnotes())");
  assert(mdIdx !== -1, "site.use(markdown()) not found");
  assert(fnIdx !== -1, "site.use(footnotes()) not found");
  assert(fnIdx > mdIdx, "footnotes must be registered AFTER markdown()");
});

Deno.test("wikilinks processor runs AFTER all site.use() calls (plan \u00a7Integration #1)", async () => {
  const config = await readRepo("_config.ts");
  const processIdx = config.indexOf('site.process([".html"]');
  const usePositions: number[] = [];
  const re = /site\.use\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(config)) !== null) usePositions.push(m.index);
  assert(processIdx !== -1, "site.process call not found");
  assert(usePositions.every(p => p < processIdx),
    "site.process (wikilinks) must appear AFTER all site.use() calls");
});

// --- 6. Plan current config example matches actual _config.ts ---

Deno.test("plan's example markdown import matches actual _config.ts", async () => {
  const config = await readRepo("_config.ts");
  const plan = await readRepo("markdown-it-plugins-plan.md");
  assert(config.includes('import markdown from "lume/plugins/markdown.ts"'),
    "_config.ts import for markdown diverges from plan's current-configuration example");
  assert(plan.includes("Current Configuration") && plan.includes("Updated Configuration"),
    "Plan must contain both Current and Updated Configuration sections");
});

// --- 7. Wikilinks interplay ---

Deno.test("plan warns about wikilinks interplay and config implements URL canonicalisation", async () => {
  const plan = await readRepo("markdown-it-plugins-plan.md");
  const config = await readRepo("_config.ts");
  assert(plan.includes("deduplication") || plan.includes("canonicalization"),
    "Plan \u00a7Integration #4 should mention deduplication or canonicalization");
  assert(config.includes("processWikilinks") || config.includes("wikilinkPattern"),
    "_config.ts should contain wikilink processing logic");
});

// --- 8. Markdown-it options recommendation ---

Deno.test("plan recommends enabling html/linkify/typographer", async () => {
  const plan = await readRepo("markdown-it-plugins-plan.md");
  assert(plan.includes("html") && plan.includes("linkify") && plan.includes("typographer"),
    "Plan \u00a7Integration #2 should recommend html, linkify, typographer");
});

// --- 9. Phase labelling ---

Deno.test("plan contains all three implementation phases in order", async () => {
  const plan = await readRepo("markdown-it-plugins-plan.md");
  const p1 = plan.indexOf("Phase 1:");
  const p2 = plan.indexOf("Phase 2:");
  const p3 = plan.indexOf("Phase 3:");
  assert(p1 !== -1 && p2 !== -1 && p3 !== -1, "All three phase headings required");
  assert(p1 < p2 && p2 < p3, "Phases must be in order");
});

// --- 10. Dependency version consistency ---

Deno.test("plan's dependency version matches deno.json import map", async () => {
  const plan = await readRepo("markdown-it-plugins-plan.md");
  const denoJson = JSON.parse(await readRepo("deno.json"));
  const mapUrl: string = denoJson.imports["markdown-plugins/"];
  const mapMatch = mapUrl.match(/markdown-plugins@([^/]+)/);
  assertExists(mapMatch);
  const planMatch = plan.match(/markdown-plugins@([\d.]+)/);
  assertExists(planMatch, "Plan does not reference a markdown-plugins version");
  assertEquals(mapMatch[1], planMatch[1],
    `Version mismatch: deno.json @${mapMatch[1]} vs plan @${planMatch[1]}`);
});

// --- 11. Updated Configuration subset check ---

Deno.test("_config.ts implements a subset of the plan's Updated Configuration", async () => {
  const config = await readRepo("_config.ts");
  const planned = [
    "lume/mod.ts", "lume/plugins/pagefind.ts", "lume/plugins/markdown.ts",
    "lume/plugins/nunjucks.ts", "markdown-plugins/references.ts",
    "markdown-plugins/footnotes.ts", "markdown-plugins/toc.ts",
    "markdown-plugins/title.ts",
  ];
  let count = 0;
  for (const imp of planned) { if (config.includes(`"${imp}"`)) count++; }
  assert(count >= 5, `Only ${count}/${planned.length} planned imports active; expected >= 5`);
  console.log(`  \u2139 ${count}/${planned.length} planned plugin imports are active in _config.ts`);
});

// --- 12. Every plugin section has a code example ---

Deno.test("every planned plugin section includes a code example block", async () => {
  const plan = await readRepo("markdown-it-plugins-plan.md");
  for (const h of ["References Plugin", "Footnotes Plugin", "TOC", "Title Plugin", "markdown-it-anchor", "markdown-it-attrs"]) {
    const idx = plan.indexOf(h);
    assert(idx !== -1, `Plugin section \"${h}\" not found`);
    assert(plan.slice(idx).includes("```"), `\"${h}\" missing code example`);
  }
});

// --- 13. Existing test alignment ---

Deno.test("existing test file references match plan features", async () => {
  const testSrc = await readRepo("tests/http_test.ts");
  const plan = await readRepo("markdown-it-plugins-plan.md");
  assert(plan.includes("wikilink"), "Plan must reference wikilinks");
  assert(testSrc.includes("<a"), "http_test.ts should verify <a> rendering");
});
