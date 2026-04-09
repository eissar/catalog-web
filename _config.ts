import lume from "lume/mod.ts";
import pagefind from "lume/plugins/pagefind.ts";
import markdown from "lume/plugins/markdown.ts";
import footnotes from "markdown-plugins/footnotes.ts";
import twitterOEmbed from "./markdown-plugins/twitter-oembed.ts";
import nunjucks from "lume/plugins/nunjucks.ts";

// Configure Lume to use 'content' as the source root.
// Notes live in  content/catalog/*.md  (URLs: /catalog/<slug>/)
// Layouts live in content/_includes/
const site = lume({ src: "./content" });

// Enable markdown processing with layout support
site.use(markdown());
site.use(footnotes());
site.use(twitterOEmbed());

// Enable Nunjucks templating for .njk layout files
site.use(nunjucks());

// Add custom filter for formatting dates to ISO 8601 format
site.filter("formatDateISO", (dateString: string) => {
  if (!dateString) return "Unknown";
  
  try {
    const date = new Date(dateString);
    return date.toISOString();
  } catch (error) {
    console.warn("Failed to parse date:", dateString, error);
    return dateString;
  }
});

// Add custom filter for parsing note filenames
site.filter("parseNoteFilename", (filename: string) => {
  if (!filename) return null;
  
  // Remove .md extension
  const base = filename.replace(/\.md$/, "");
  const parts = base.split(".");
  
  if (parts.length < 2) {
    return null; // Doesn't match the naming convention
  }
  
  const category = parts.pop()!; // Last part is category
  const name = parts.join(".");   // Everything else is the name (handles dots in name)
  
  return { name, category };
});

// Enable PageFind for static search indexing
site.use(pagefind());

// ============================================================================
// Zettelkasten Note Naming System
// ============================================================================
// Filename format: <name>.<category>.md
// - delegation.philosophy.md → Note "delegation" in category "philosophy"
// - automation.map.md → Map file for the "automation" category
//
// Map files (<category>.map.md) are parent/index nodes that should backlink
// to all notes in that category (e.g., automation.map.md → *.automation.md)

interface NoteInfo {
  name: string;      // Note name (e.g., "delegation")
  category: string;  // Category (e.g., "philosophy")
  title: string;     // Display title
  url: string;       // Page URL
  isMap: boolean;    // Whether this is a map file
}

/**
 * Parse a filename to extract note name and category.
 * Format: <name>.<category>.md
 * Examples:
 *   - "delegation.philosophy.md" → { name: "delegation", category: "philosophy" }
 *   - "automation.map.md" → { name: "automation", category: "map" }
 *   - "empathy-machine.md" → { name: "empathy-machine", category: "uncategorized" }
 */
function parseNoteFilename(filename: string): { name: string; category: string } | null {
  // Remove .md extension
  const base = filename.replace(/\.md$/, "");
  const parts = base.split(".");
  
  if (parts.length < 2) {
    // Files without category get "uncategorized" as category
    return { name: base, category: "uncategorized" };
  }
  
  const category = parts.pop()!; // Last part is category
  const name = parts.join(".");   // Everything else is the name (handles dots in name)
  
  return { name, category };
}

/**
 * Build an index mapping categories to their notes.
 * Map files are excluded from this index (they reference notes, not the other way).
 */
function buildCategoryIndex(pages: any[]): Map<string, NoteInfo[]> {
  const index = new Map<string, NoteInfo[]>();
  
  for (const page of pages) {
    const url = page.data.url as string | undefined;
    if (!url) continue;
    
    // Get the source file basename
    const srcPath = page.src?.path as string | undefined;
    if (!srcPath) continue;
    
    const filename = srcPath.split("/").pop()!;
    const parsed = parseNoteFilename(filename);
    
    if (!parsed) continue;
    
    const { name, category } = parsed;
    const isMap = category === "map";
    
    // Get title from frontmatter or derive from name
    const title = (page.data.title as string) || name;
    
    const noteInfo: NoteInfo = { name, category, title, url, isMap };
    
    // Add to category index (skip map files - they're parents, not children)
    if (!isMap) {
      const existing = index.get(category) || [];
      existing.push(noteInfo);
      index.set(category, existing);
    }
  }
  
  return index;
}

// Preprocessor to add backlinks data to map files and metadata to all notes
site.preprocess([".md"], (pages) => {
  // Build the category → notes index
  const categoryIndex = buildCategoryIndex(pages);
  
  // Build a flat list of all catalog notes for navigation
  const catalogNotes: NoteInfo[] = [];
  
  for (const page of pages) {
    const srcPath = page.src?.path as string | undefined;
    if (!srcPath) continue;
    
    const filename = srcPath.split("/").pop()!;
    const parsed = parseNoteFilename(filename);
    
    if (!parsed) continue;
    
    const { name, category } = parsed;
    const isMap = category === "map";
    
    // Add note metadata for all notes (accessible in templates)
    page.data.noteName = name;
    page.data.noteCategory = isMap ? "map" : category;
    page.data.isMap = isMap;
    
    // Add to catalog notes list (skip map files for navigation)
    if (!isMap) {
      const url = page.data.url as string | undefined;
      const title = (page.data.title as string) || name;
      if (url) {
        catalogNotes.push({ name, category, title, url, isMap });
      }
    }
    
    if (isMap) {
      // This is a map file - add backlinks to notes in this category
      const mapCategory = name; // For map files, the name IS the category
      const backlinks = categoryIndex.get(mapCategory) || [];
      
      // Sort backlinks alphabetically by title
      backlinks.sort((a, b) => a.title.localeCompare(b.title));
      
      // Add to page data for template access
      page.data.backlinks = backlinks;
      page.data.mapCategory = mapCategory;
    }
  }
  
  // Sort catalog notes alphabetically by title
  catalogNotes.sort((a, b) => a.title.localeCompare(b.title));
  
  // Add catalog notes to all pages for navigation
  console.log(`Setting catalogNotes on ${pages.length} pages`);
  console.log(`catalogNotes contains ${catalogNotes.length} notes:`);
  catalogNotes.forEach(note => console.log(`  - ${note.title} (${note.url})`));
  
  for (const page of pages) {
    page.data.catalogNotes = catalogNotes;
  }
});

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
        return `<a href="${href}" class="wikilink">[${escapeHtml(displayText)}]</a>`;
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
