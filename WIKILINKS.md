# Wikilinks Implementation

Your Lume site now supports **wikilinks** - the `[[double bracket]]` syntax for creating internal links between notes.

## Usage

### Basic Wikilink
```markdown
Link to another note: [[other-note]]
```

### Wikilink with Heading Anchor
```markdown
Link to a specific section: [[other-note#heading-name]]
```

### Display Text (Optional)
Wikilinks automatically use the target page's title or the wikilink text as the display text. You can use the `|` syntax to override:
```markdown
[[other-note|Custom Display Text]]
```

## How It Works

1. **Parsing**: The `markdown-plugins/wikilinks` plugin parses `[[...]]` syntax during markdown processing
2. **Resolution**: After all pages are processed, links are resolved to actual URLs by matching:
   - Page ID (from front matter)
   - Page title (case-insensitive)
   - Page slug
3. **Validation**: Links that don't match any page are marked with:
   - `class="broken-link"`
   - `title="Page not found"`

## Styling

Broken links are styled differently via CSS:
```css
a.broken-link {
  color: #888; /* Grey for broken links */
  text-decoration: line-through;
}
```

Add this to your `default.njk` template to style broken links.

## Matching Algorithm

The wikilink resolver matches against:
- **ID**: `id` field in front matter (exact match)
- **Title**: `title` field in front matter (case-insensitive)
- **Slug**: File name without extension (case-insensitive)

For example, a file named `my-note.md` with front matter `title: "My Note"` will be matched by:
- `[[my-note]]`
- `[[My Note]]`
- `[[my-note#section]]`

## Example

Given these files:
- `automation.map.md` with `title: "Automation"`
- `shounen-manga.writing.md` with `title: "Shounen Manga"`

Markdown:
```markdown
Read about [[automation.map]] for more details.
See the section on [[shounen-manga.writing#selling-out]].
```

Output:
```html
<p>Read about <a href="/catalog/automation.map/">Automation</a> for more details.</p>
<p>See the section on <a href="/catalog/shounen-manga.writing/#selling-out">Shounen Manga</a>.</p>
```

## Configuration

The wikilinks plugin is configured in `_config.ts`:

```typescript
import wikilinks from "./markdown-plugins/wikilinks.ts";

// Enable wikilinks parsing
site.use(wikilinks());

// Resolve wikilinks to actual page URLs
site.process([".html"], (pages) => {
  // Resolution logic (already configured)
});
```

## Current Implementation

- ✅ Wikilinks parsed from `[[...]]` syntax
- ✅ Support for heading anchors with `#`
- ✅ Case-insensitive matching
- ✅ Broken link detection and styling
- ✅ Works with existing catalog structure
