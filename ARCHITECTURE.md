# Architecture

## Project Description

**Catalog Web** is a static note catalog built using **[Lume](https://lume.land/)**, a Deno-based Static Site Generator (SSG). It is designed to provide a fast, searchable, and lightweight way to browse a collection of Markdown-based notes.

Key features include:
- **Deno-powered**: Leverages the Deno runtime for building and running the site.
- **Full-text Search**: Integrated with **[PageFind](https://pagefind.app/)** for efficient, client-side search that is indexed at build time.
- **Automated Deployment**: Continuous Integration and Deployment (CI/CD) via Woodpecker CI.
- **Cloudflare Pages Hosting**: The site is deployed to Cloudflare Pages.

## CI/CD Pipeline (Woodpecker CI)

The automation pipeline is defined in `.woodpecker.yml`. The pipeline is triggered on `push` or `manual` events on the `master` branch.

### Pipeline Steps

1.  **Build (`build`)**:
    - Uses the custom Docker image `ghcr.io/eissar/catalog-web-builder:latest`.
    - Executes `deno task build` to generate the static site in the `_site/` directory.
2.  **Validate (`validate`)**:
    - Ensures that the build process actually produced catalog files.
    - It searches for `.html` files within the `_site/catalog/` path. If no files are found, the pipeline fails.
3.  **Deploy (`deploy`)**:
    - Uses the `cloudflare_api_token` secret to authenticate with Cloudflare.
    - Deploys the `_site/` directory to Cloudflare Pages using `wrangler`.

## Deployment & Monitoring

### Published URL
The live site is deployed to Cloudflare Pages.

### How to check deployments
- **Woodpecker CI Dashboard**: You can monitor the status of builds, validations, and deployments directly in your Woodpecker CI instance.
- **Cloudflare Dashboard**: Check the Pages project to see deployment history and status.
- **Browser**: Simply refresh the published URL to see the latest changes after a successful pipeline run.

## Project Structure

```text
.
├── _config.ts            # Lume configuration
├── .woodpecker.yml       # Woodpecker CI pipeline definition
├── content/              # Source Markdown files
│   └── catalog/          # Your notes go here
├── _site/                # Build output (generated)
├── deno.json             # Deno tasks and configuration
└── README.md             # Project documentation
```
