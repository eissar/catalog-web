# Architecture

## Project Description

**Catalog Web** is a static note catalog built using **[Lume](https://lume.land/)**, a Deno-based Static Site Generator (SSG). It is designed to provide a fast, searchable, and lightweight way to browse a collection of Markdown-based notes.

Key features include:
- **Deno-powered**: Leverages the Deno runtime for building and running the site.
- **Full-text Search**: Integrated with **[PageFind](https://pagefind.app/)** for efficient, client-side search that is indexed at build time.
- **Automated Deployment**: Continuous Integration and Deployment (CI/CD) via Woodpecker CI.
- **GitHub Pages Hosting**: The site is hosted on GitHub Pages via the `gh-pages` branch.

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
    - Uses the `github_token` secret to authenticate with GitHub.
    - Initializes a temporary `gh-pages` repository.
    - Synchronizes the contents of `_site/` to the `gh-pages` branch using `rsync`.
    - Adds a `.nojekyll` file to ensure GitHub Pages doesn't process the site with Jekyll.
    - Force-pushes the updated `gh-pages` branch to the remote repository.

## Deployment & Monitoring

### Published URL
The live site can be accessed at:
👉 **[https://eissar.github.io/catalog-web/](https://eissar.github.io/catalog-web/)**

### How to check deployments
- **Woodpecker CI Dashboard**: You can monitor the status of builds, validations, and deployments directly in your Woodpecker CI instance.
- **GitHub Repository**:
    - Check the `gh-pages` branch to see the latest deployed static files.
    - Check the "Actions" or "Deployments" tab (if applicable) to see the history of successful deployments.
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
