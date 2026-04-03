/**
 * Markdown-it plugin for parsing wikilinks: [[page]] or [[page#heading]] or [[page|Display Text]]
 * 
 * This plugin converts [[wikilink]] syntax into anchor tags with a data-wikilink attribute.
 * The actual URL resolution is handled by the resolver in _config.ts.
 */

import type MarkdownIt from "markdown-it";

export default function wikilinksPlugin(md: MarkdownIt): void {
  // Safety check
  if (!md || typeof md !== "object") {
    console.warn("wikilinks: Invalid markdown-it instance");
    return;
  }

  // Try to use ruler.after for inline rules
  if (md.ruler && typeof md.ruler.after === "function") {
    md.ruler.after("inline", "wikilinks", wikilinksRule);
  } else if (md.inline?.ruler?.push) {
    // Fallback: push directly to inline ruler before html_inline
    md.inline.ruler.push(wikilinksRule);
  } else {
    console.warn("wikilinks: Could not register wikilinks rule - ruler methods not available");
  }
}

/**
 * The wikilinks rule function - processes tokens and converts [[wikilink]] syntax
 */
function wikilinksRule(state: any): boolean {
  // Process all tokens
  for (let i = 0; i < state.tokens.length; i++) {
    const token = state.tokens[i];
    
    // Process inline tokens that might contain wikilinks
    if (token.type === "inline" && token.children) {
      const newChildren: any[] = [];
      
      for (let j = 0; j < token.children.length; j++) {
        const child = token.children[j];
        
        if (child.type === "text" && child.content.includes("[[")) {
          // Split text content by wikilink pattern and process
          const parts = splitByWikilinks(child.content);
          for (const part of parts) {
            if (part.type === "wikilink") {
              // Create opening anchor token
              const openToken = new state.Token("html_inline", "", 0);
              openToken.content = `<a href="#!" data-wikilink="${escapeHtml(part.wikilinkId)}">`;
              newChildren.push(openToken);
              
              // Create text token for display
              const textToken = new state.Token("text", "", 0);
              textToken.content = part.displayText;
              newChildren.push(textToken);
              
              // Create closing anchor token
              const closeToken = new state.Token("html_inline", "", 0);
              closeToken.content = `</a>`;
              newChildren.push(closeToken);
            } else {
              // Clone the original token with the text content
              const textClone = new state.Token("text", "", 0);
              textClone.content = part.content || "";
              newChildren.push(textClone);
            }
          }
        } else {
          newChildren.push(child);
        }
      }
      
      token.children = newChildren;
    }
  }
  
  return true;
}

interface TextPart {
  type: "text" | "wikilink";
  content?: string;
  wikilinkId?: string;
  displayText?: string;
}

function splitByWikilinks(content: string): TextPart[] {
  const parts: TextPart[] = [];
  const regex = /\[\[([^\]|#]+)(?:#([^|\]]+))?(?:\|([^\]]+))?\]\]/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    
    const pageRef = match[1].trim();
    const heading = match[2]?.trim();
    const displayText = match[3]?.trim() || pageRef;
    const wikilinkId = heading ? `${pageRef}#${heading}` : pageRef;
    
    parts.push({
      type: "wikilink",
      wikilinkId,
      displayText
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after last match
  if (lastIndex < content.length) {
    parts.push({ type: "text", content: content.slice(lastIndex) });
  }
  
  return parts;
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
