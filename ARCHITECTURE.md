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
