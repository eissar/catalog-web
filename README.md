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

This runs Lume, which:
- Renders all `.md` files in `content/catalog/` using the layout in `content/_includes/default.njk`
- Runs the **PageFind indexer** — outputs a static search index to `_site/pagefind/`

Output is written to `_site/` (symlinked to `/home/eissar/code/catalog-web/_site`).

### 3. Serve locally (dev mode with live reload)

```bash
$DENO_HOME task serve
```

## Project Structure

```
.
├── .env                  # DENO_HOME path (source this file)
├── _config.ts            # Lume configuration (src = ./content)
├── deno.json             # Deno tasks & permissions
├── content/
│   ├── _includes/
│   │   └── default.njk   # Default layout template (search bar + note styling)
│   └── catalog/          # ← Your notes go here (nothing else!)
│       └── example-page.md
├── _site/                # → Build output (symlink)
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

## Tasks

| Command | Description |
|---|---|
| `$DENO_HOME task build` | Production build |
| `$DENO_HOME task serve` | Dev server with live reload |
| `$DENO_HOME task lume` | Raw Lume CLI access |
| `$DENO_HOME task index` | Custom index + build script |

## Deployment

The site is automatically deployed to **Cloudflare Pages** using **Woodpecker CI**. When changes are pushed to the `master` branch, Woodpecker CI will:

1. Build the site using Deno and Lume
2. Validate that catalog files are present
3. Deploy the built site to Cloudflare Pages using `wrangler`

### Woodpecker CI Setup

To set up Woodpecker CI for this repository:

1. **Enable Woodpecker CI** on your Woodpecker instance
2. **Add the Cloudflare API token secret**:
   - Create a Cloudflare API token with Pages deployment permissions
   - Add it as a secret named `cloudflare_api_token` in Woodpecker CI

3. **Configure the repository** in Woodpecker CI to use the `.woodpecker.yml` configuration

The deployment pipeline is defined in `.woodpecker.yml` and handles the entire build and deployment process automatically.
