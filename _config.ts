import lume from "lume/mod.ts";
import pagefind from "lume/plugins/pagefind.ts";
import markdown from "lume/plugins/markdown.ts";
import nunjucks from "lume/plugins/nunjucks.ts";

// Configure Lume to use 'content' as the source root.
// Notes live in  content/catalog/*.md  (URLs: /catalog/<slug>/)
// Layouts live in content/_includes/
const site = lume({ src: "./content" });

// Enable markdown processing with layout support
site.use(markdown());

// Enable Nunjucks templating for .njk layout files
site.use(nunjucks());

// Enable PageFind for static search indexing
site.use(pagefind());

// Wikilink regex pattern: [[page]] or [[page#heading]] or [[page|Display Text]]
const wikilinkPattern = /\[\[([^\]|#]+)(?:#([^|\]]+))?(?:\|([^\]]+))?\]\]/g;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function processWikilinks(html: string, pages: any[]): string {
  return html.replace(/<p>(.*?)<\/p>/gs, (match, content) => {
    // Check if content contains wikilinks
    if (!content.includes("[[")) {
      return match;
    }
    
    // Process wikilinks in the content
    const processedContent = content.replace(wikilinkPattern, (full, page, heading, display) => {
      const pageRef = page.trim();
      const headingRef = heading?.trim();
      const displayText = display?.trim() || pageRef;
      const wikilinkId = headingRef ? `${pageRef}#${headingRef}` : pageRef;
      
      // Try to find matching page
      const targetPage = pages.find((p) => {
        const pageId = p.data.id as string | undefined;
        const pageTitle = (p.data.title as string | undefined)?.toLowerCase();
        const slug = p.data.slug as string | undefined;
        const url = p.data.url as string | undefined;
        
        const urlPath = url?.replace(/\.(html?|md)$/, "").replace(/\/+$/, "").split("/").pop()?.toLowerCase();
        
        return (
          pageId === wikilinkId ||
          pageTitle === wikilinkId.toLowerCase() ||
          slug === wikilinkId ||
          slug?.toLowerCase() === wikilinkId.toLowerCase() ||
          urlPath === wikilinkId.toLowerCase()
        );
      });
      
      if (targetPage) {
        const href = headingRef 
          ? `${targetPage.data.url}#${headingRef}`
          : targetPage.data.url;
        return `<a href="${href}" class="wikilink">${escapeHtml(displayText)}</a>`;
      } else {
        return `<a href="#" class="broken-link" title="Page not found: ${escapeHtml(wikilinkId)}">${escapeHtml(displayText)}</a>`;
      }
    });
    
    return `<p>${processedContent}</p>`;
  });
}

// Process pages after HTML generation to resolve wikilinks
site.process([".html"], (pages) => {
  for (const page of pages) {
    if (page.document && page.content) {
      // Process the HTML content for wikilinks
      const body = page.document.querySelector("body");
      if (body) {
        const html = body.innerHTML;
        const processed = processWikilinks(html, pages);
        body.innerHTML = processed;
      }
    }
  }
});

export default site;
