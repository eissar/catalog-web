# Architecture

## Project Description

**Catalog Web** is a static note catalog built using **[Lume](https://lume.land/)**, a Deno-based Static Site Generator (SSG). It is designed to provide a fast, searchable, and lightweight way to browse a collection of Markdown-based notes.

Key features include:
- **Deno-powered**: Leverages the Deno runtime for building and running the site.
- **Full-text Search**: Integrated with **[PageFind](https://pagefind.app/)** for efficient, client-side search that is indexed at build time.
- **Wikilinks**: Supports `[[page]]`, `[[page|Display Text]]`, and `[[page#heading]]` syntax for inter-note linking. Resolved links are styled with the `.wikilink` class; unresolved links receive the `.broken-link` class (greyed out, strikethrough).
- **Automated Deployment**: Continuous Integration and Deployment (CI/CD) via Woodpecker CI.
- **Cloudflare Workers Hosting**: The site is deployed to Cloudflare Workers as static assets.

## Build Process

The build is orchestrated by `build.ts`, which runs when `deno task build` is invoked:

1.  **Catalog clone**: If the external catalog repository doesn't exist locally, it clones it from `https://github.com/eissar/catalog` into the `catalog/` directory (configurable via `CATALOG_DIR` env var).
2.  **Sync**: Copies all `.md` files from the catalog into `content/catalog/` (Lume's source root) in parallel. During sync it:
    - Fixes date/lastmod frontmatter quoting issues.
    - Injects `layout: default.njk` into frontmatter if not already present.
3.  **Lume build**: Runs the Lume CLI to render pages, process wikilinks, and generate the PageFind search index into `_site/`.

## CI/CD Pipeline (Woodpecker CI)

The automation pipeline is defined in `.woodpecker.yml`. The pipeline is triggered on `push` or `manual` events on the `master` branch.

### Builder Image

A custom Docker image (`ghcr.io/eissar/catalog-web-builder:latest`) is used for all steps. It is built from `Dockerfile` and includes:
- Deno runtime
- Git, rsync, Node.js, and npm
- Wrangler CLI (installed globally via npm)

### Pipeline Steps

1.  **Build (`build`)**:
    - Executes `deno task build` to clone the catalog, sync files, and generate the static site in the `_site/` directory.
2.  **Validate (`validate`)**:
    - Ensures that the build process actually produced catalog files.
    - It searches for `.html` files within the `_site/catalog/` path. If no files are found, the pipeline fails.
3.  **Deploy (`deploy`)**:
    - Uses the `cloudflare_api_token` secret to authenticate with Cloudflare.
    - Runs `npx wrangler deploy`, which reads configuration from `wrangler.toml` (worker name, compatibility date, assets directory).

## Deployment & Monitoring

### Published URL
The live site is deployed to Cloudflare Workers. The `wrangler.toml` file configures the worker name (`catalog-web`), compatibility date, and serves static assets from `./_site`.

### How to check deployments
- **Woodpecker CI Dashboard**: You can monitor the status of builds, validations, and deployments directly in your Woodpecker CI instance.
- **Cloudflare Dashboard**: Check the Workers project to see deployment history and status.
- **Browser**: Simply refresh the published URL to see the latest changes after a successful pipeline run.

## Note Naming System (Zettelkasten)

The static site generator renders a **Zettelkasten** — a flat-file catalog of notes where categories are derived from the filename schema rather than directory structure.

### Filename Format

```
<name>.<category>.md
```

Examples:
- `delegation.philosophy.md` → Note named "delegation" in the "philosophy" category
- `ontology.metaphysics.md` → Note named "ontology" in the "metaphysics" category
- `reflection.practice.md` → Note named "reflection" in the "practice" category

### Category Derivation

Categories are **not** directories; they are encoded in the filename itself. This enables:
- Flat file storage (all notes in a single directory)
- Flexible categorization without nested folder hierarchies
- Easy recategorization by renaming files

### Map Files (Special Category)

The `map` category has special semantic meaning. A file named:

```
<category>.map.md
```

represents a **parent/index node** for that category. It serves as a hierarchical anchor in the otherwise flat structure.

**Example:**
- `philosophy.map.md` → Parent node for the "philosophy" category

**Backlinking Rule:**
A map file should automatically backlink to any note whose category includes the map's name:
- `philosophy.map.md` links to all `*.philosophy.md` notes
- `practice.map.md` links to all `*.practice.md` notes

This creates a navigable hierarchy: visiting `philosophy.map` shows all philosophy-related notes.

## Proposed Backlinking Implementation Methods

There are several approaches to implement automatic backlinking from map files to their category notes:

### Method 1: Build-Time Injection (Recommended)

Modify `build.ts` to inject backlinks into map files during the sync phase:

1. **First pass**: Collect all note filenames and extract categories
2. **Second pass**: For each `*.map.md` file:
   - Extract the category name from the filename (e.g., `philosophy.map.md` → `philosophy`)
   - Find all files matching `*.<category>.md`
   - Inject a backlinks section into the file content before writing

**Pros**: 
- Simple, single-pass processing
- No Lume plugin complexity
- Backlinks are baked into the content permanently

**Cons**: 
- Requires two-pass file processing
- Backlinks only update on rebuild

### Method 2: Lume Plugin (Data Extension)

Create a Lume preprocessor in `_config.ts` that:

1. Registers a `preprocess` hook for `.md` files
2. Builds a category index from all page data
3. For map files, dynamically adds a `backlinks` data property
4. Renders backlinks via the template (Nunjucks)

```typescript
// Pseudo-code
site.preprocess([".md"], (pages) => {
  // Build category → pages mapping
  const categoryIndex = buildCategoryIndex(pages);
  
  for (const page of pages) {
    if (isMapFile(page)) {
      const category = extractCategory(page);
      page.data.backlinks = categoryIndex[category] || [];
    }
  }
});
```

**Pros**:
- Cleaner separation of concerns
- Template can control rendering
- Works with Lume's data pipeline

**Cons**:
- More complex plugin code
- Requires understanding Lume's data lifecycle

### Method 3: Lume Renderer (Post-Process)

Add a post-processor in `_config.ts` that modifies rendered HTML:

1. After HTML generation, parse all pages
2. Build category index from rendered pages
3. For map file HTML, inject a backlinks section into the body

```typescript
site.process([".html"], (pages) => {
  const categoryIndex = buildCategoryIndex(pages);
  
  for (const page of pages) {
    if (isMapFile(page)) {
      const backlinks = generateBacklinksHTML(categoryIndex, page);
      injectIntoBody(page, backlinks);
    }
  }
});
```

**Pros**:
- Works with existing wikilink processor
- Can leverage full HTML context

**Cons**:
- Operates on rendered HTML (harder to debug)
- May conflict with existing processors

### Method 4: Hybrid Approach (Frontmatter + Template)

Modify `build.ts` to inject category metadata into frontmatter:

```yaml
---
layout: default.njk
category: philosophy
is_map: true
---
```

Then create a Nunjucks template (`default.njk`) that:

1. Checks if `is_map` is true
2. Uses Lume's `search` plugin to find related pages
3. Renders backlinks section dynamically

**Pros**:
- Declarative approach
- Template controls presentation
- Easy to extend with other metadata

**Cons**:
- Requires Lume search plugin configuration
- More template complexity

### Recommendation

**Method 1 (Build-Time Injection)** is recommended for initial implementation because:
- It's the simplest to implement and debug
- It doesn't require deep Lume plugin knowledge
- The backlinks are part of the content, making them searchable by PageFind
- It follows the existing pattern of content modification in `build.ts`

Future iterations could migrate to **Method 2** or **Method 4** for more dynamic behavior.

## Project Structure

```text
.
├── _config.ts            # Lume configuration (wikilinks, plugins, processors)
├── .woodpecker.yml       # Woodpecker CI pipeline definition
├── build.ts              # Custom build script (clone catalog, sync, build)
├── Dockerfile            # CI builder image (Deno + Node.js + Wrangler)
├── wrangler.toml         # Cloudflare Workers deployment config
├── deno.json             # Deno tasks, imports, and configuration
├── content/              # Lume source root
│   ├── _includes/
│   │   └── default.njk   # Default layout (search bar + note styling)
│   └── catalog/          # Synced from external catalog repo at build time (git-ignored)
├── catalog -> …/catalog  # Symlink to external catalog repo (git-ignored)
├── _site -> …/catalog-web/_site  # Build output symlink (git-ignored)
└── README.md             # Project documentation
```
