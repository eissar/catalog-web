import lume from "lume/mod.ts";
import pagefind from "lume/plugins/pagefind.ts";
import markdown from "lume/plugins/markdown.ts";
import nunjucks from "lume/plugins/nunjucks.ts";
import wikilinks from "markdown-plugins/wikilinks.ts";

// Configure Lume to use 'content' as the source root.
// Notes live in  content/catalog/*.md  (URLs: /catalog/<slug>/)
// Layouts live in content/_includes/
const site = lume({ src: "./content" });

// Enable markdown processing with layout support
site.use(markdown());

// Enable wikilinks parsing (e.g., [[page-name]] or [[page#heading]])
site.use(wikilinks());

// Enable Nunjucks templating for .njk layout files
site.use(nunjucks());

// Enable PageFind for static search indexing
site.use(pagefind());

// Resolve wikilinks to actual page URLs after all pages are processed
site.process([".html"], (pages) => {
  for (const page of pages) {
    // Find all wikilinks in the page
    for (const link of page.document!.querySelectorAll("a[data-wikilink]")) {
      const wikilinkId = link.getAttribute("data-wikilink")!;
      link.removeAttribute("data-wikilink");

      // Try to find a page with matching ID, title, or slug
      const targetPage = pages.find((p) => {
        const pageId = p.data.id as string | undefined;
        const pageTitle = (p.data.title as string | undefined)?.toLowerCase();
        const slug = p.data.slug as string | undefined;
        const url = p.data.url as string | undefined;
        
        // Extract the last part of the URL (filename without extension) for comparison
        // Remove trailing slashes and extensions, then get the last path segment
        const urlPath = url?.replace(/\.(html?|md)$/, "").replace(/\/+$/, "").split("/").pop();
        
        // Match by ID, title, slug, or URL path (case-insensitive)
        return (
          pageId === wikilinkId ||
          pageTitle === wikilinkId.toLowerCase() ||
          slug === wikilinkId ||
          urlPath === wikilinkId
        );
      });

      if (targetPage) {
        // Check if wikilink contains a heading anchor (e.g., "page#heading")
        if (wikilinkId.includes("#")) {
          const [pageRef, heading] = wikilinkId.split("#", 2);
          // Use the base URL and add the heading anchor
          link.setAttribute("href", targetPage.data.url + "#" + heading);
        } else {
          link.setAttribute("href", targetPage.data.url);
        }
      } else {
        // Mark as broken link
        link.setAttribute("title", "Page not found");
        link.classList.add("broken-link");
      }
    }
  }
});

export default site;
