# 📓 Catalog Web

A static note catalog built with **[Lume](https://lume.land/)** (Deno-based SSG) and **[PageFind](https://pagefind.app/)** for full-text search.

## Quick Start

> ⚠️ Do **not** add Deno to your system `PATH`. Use the `.env` variable instead.

### 1. Source the environment

```bash
source .env
```

This sets `$DENO_HOME` to the Deno binary location. All commands below use this variable.

### 2. Build the site

```bash
$DENO_HOME task build
```

This runs `build.ts`, which:
1. Clones the external catalog repository (if not already present)
2. Syncs `.md` files into `content/catalog/`, fixing frontmatter and injecting layouts
3. Runs Lume, which renders pages, processes wikilinks, and runs the **PageFind indexer** — outputs a static search index to `_site/pagefind/`

Output is written to `_site/` (symlinked to `/home/eissar/code/catalog-web/_site`).

### 3. Serve locally (dev mode with live reload)

```bash
$DENO_HOME task serve
```

## Project Structure

```
.
├── .env                  # DENO_HOME path (source this file)
├── _config.ts            # Lume configuration (wikilinks, plugins, processors)
├── build.ts              # Custom build script (clone catalog, sync, build)
├── Dockerfile            # CI builder image (Deno + Node.js + Wrangler)
├── wrangler.toml         # Cloudflare Workers deployment config
├── deno.json             # Deno tasks & permissions
├── content/
│   ├── _includes/
│   │   └── default.njk   # Default layout template (search bar + note styling)
│   └── catalog/          # ← Synced from external catalog repo at build time
├── catalog -> …/catalog  # Symlink to external catalog repo (git-ignored)
├── _site -> …/_site      # Build output (symlink, git-ignored)
└── README.md
```

## Adding Notes

Drop any Markdown file into `content/catalog/`. It will automatically:

- Use the default layout (`default.njk`) with search and styled rendering
- Be indexed by PageFind for search
- Appear at `/catalog/<filename-without-extension>/`

Frontmatter example:

```yaml
---
title: "My Note Title"
---
# Your content here
```

## Search

The search bar (in the header of every page) is powered by **PageFind**:
- Indexing happens at **build time** — zero client-side cost
- Results appear instantly as you type (debounced 200ms)
- Shows title + excerpt with highlighted matches

## Wikilinks

Notes can reference each other using `[[wikilink]]` syntax. Supported forms:

| Syntax | Description |
|---|---|
| `[[Page Name]]` | Link to another note by title, slug, or filename |
| `[[Page Name|Display Text]]` | Link with custom display text (rendered as `[Display Text]`) |
| `[[Page Name#Heading]]` | Link to a specific heading within a note |

- Resolved links get the `.wikilink` CSS class.
- Unresolved links (broken) get the `.broken-link` class and appear greyed out with strikethrough.
- Wikilink resolution matches against page `id`, `title`, `slug`, and URL path.

## Tasks

| Command | Description |
|---|---|
| `$DENO_HOME task build` | Production build |
| `$DENO_HOME task serve` | Dev server with live reload |
| `$DENO_HOME task lume` | Raw Lume CLI access |
| `$DENO_HOME task index` | Custom index + build script |

## Deployment

The site is automatically deployed to **Cloudflare Workers** using **Woodpecker CI**. When changes are pushed to the `master` branch, Woodpecker CI will:

1. Build the site using Deno and Lume
2. Validate that catalog files are present
3. Deploy the built site to Cloudflare Workers using `wrangler`

### Woodpecker CI Setup

To set up Woodpecker CI for this repository:

1. **Enable Woodpecker CI** on your Woodpecker instance
2. **Add the Cloudflare API token secret**:
   - Create a Cloudflare API token with Workers deployment permissions
   - Add it as a secret named `cloudflare_api_token` in Woodpecker CI

3. **Configure the repository** in Woodpecker CI to use the `.woodpecker.yml` configuration

The deployment pipeline is defined in `.woodpecker.yml` and handles the entire build and deployment process automatically. Deployment settings (worker name, compatibility date, assets directory) are configured in `wrangler.toml`.
