# Markdown-it Plugins Plan for Zettelkasten System

## Executive Summary

This document outlines the recommended markdown-it plugins for enhancing the Zettelkasten functionality of the Catalog Web project. The project currently uses Lume as a static site generator with custom wikilinks implementation.

## Current System Analysis

### Existing Features
- **Lume SSG**: Deno-based static site generator
- **Wikilinks**: Custom implementation supporting `[[page]]`, `[[page#heading]]`, and `[[page|Display Text]]` syntax
- **PageFind**: Full-text search integration
- **Custom Processing**: Wikilinks resolution in `_config.ts`

### Current Configuration
```typescript
// _config.ts
import lume from "lume/mod.ts";
import pagefind from "lume/plugins/pagefind.ts";
import markdown from "lume/plugins/markdown.ts";
import nunjucks from "lume/plugins/nunjucks.ts";

const site = lume({ src: "./content" });
site.use(markdown());
site.use(nunjucks());
site.use(pagefind());
```

## Recommended Plugins for Zettelkasten

### Priority 1: Essential Plugins

#### 1. References Plugin
**Importance**: Highest
**Purpose**: Creates automatic backlinks (bidirectional linking)
**Zettelkasten Value**: Core feature enabling web of interconnected ideas

```typescript
import references from "markdown-plugins/references.ts";
site.use(references());
```

**Template Implementation**:
```html
{% if references and references.length %}
<div class="backlinks">
  <h3>Backlinks</h3>
  <ul>
    {% for link in search.pages(`references*='${url}'`) %}
    <li><a href="{{ link.url }}">{{ link.title }}</a></li>
    {% endfor %}
  </ul>
</div>
{% endif %}
```

#### 2. Footnotes Plugin
**Importance**: High
**Purpose**: Academic citations and references
**Zettelkasten Value**: Supports scholarly note-taking practices

```typescript
import footnotes from "markdown-plugins/footnotes.ts";
site.use(footnotes());
```

**Template Implementation**:
```html
{% if footnotes and footnotes.length %}
<section class="footnotes">
  <h3>Footnotes</h3>
  <ol>
    {% for note in footnotes %}
    <li id="{{ note.id }}">{{ note.content }} <a href="#{{ note.refId }}" class="footnote-backref">↩</a></li>
    {% endfor %}
  </ol>
</section>
{% endif %}
```

### Priority 2: Useful Enhancements

#### 3. TOC (Table of Contents) Plugin
**Importance**: Medium
**Purpose**: Navigation for longer notes
**Zettelkasten Value**: Hierarchical organization support

```typescript
import toc from "markdown-plugins/toc.ts";
site.use(toc());
```

**Template Implementation**:
```html
{% if toc and toc.length %}
<nav class="table-of-contents">
  <h3>Table of Contents</h3>
  {{ toc | safe }}
</nav>
{% endif %}
```

#### 4. Title Plugin
**Importance**: Medium
**Purpose**: Automatic title extraction
**Zettelkasten Value**: Reduces frontmatter requirements

```typescript
import title from "markdown-plugins/title.ts";
site.use(title());
```

### Priority 3: Standard markdown-it Plugins

#### markdown-it-anchor
**Purpose**: Header anchors for deep linking
**Zettelkasten Value**: Internal note navigation

#### markdown-it-attrs (Already included)
**Purpose**: Custom element attributes
**Zettelkasten Value**: Styling flexibility

## Implementation Plan

### Phase 1: Core Zettelkasten Features
1. **Add References Plugin** - Enable bidirectional linking
2. **Add Footnotes Plugin** - Support academic citations
3. **Update Templates** - Display backlinks and footnotes

### Phase 2: Navigation Enhancements
1. **Add TOC Plugin** - Improve note navigation
2. **Add Title Plugin** - Simplify note creation

### Phase 3: Advanced Features
1. **Evaluate Additional Plugins** - Based on usage patterns
2. **Custom Plugin Development** - If specific Zettelkasten needs arise

## Updated Configuration

```typescript
import lume from "lume/mod.ts";
import pagefind from "lume/plugins/pagefind.ts";
import markdown from "lume/plugins/markdown.ts";
import nunjucks from "lume/plugins/nunjucks.ts";
import references from "markdown-plugins/references.ts";
import footnotes from "markdown-plugins/footnotes.ts";
import toc from "markdown-plugins/toc.ts";
import title from "markdown-plugins/title.ts";

const site = lume({ src: "./content" });

// Core markdown processing
site.use(markdown());
site.use(nunjucks());
site.use(pagefind());

// Zettelkasten-specific plugins
site.use(references());
site.use(footnotes());
site.use(toc());
site.use(title());

// Existing wikilinks processing remains
// ... (current wikilinks implementation)

export default site;
```

## Expected Benefits

1. **Enhanced Connectivity**: Automatic backlinks create true knowledge networks
2. **Academic Rigor**: Proper citation support for scholarly work
3. **Improved Navigation**: Better structure and internal linking
4. **Reduced Metadata**: Less frontmatter required for simple notes
5. **Scalability**: Better support for large note collections

## Dependencies

All plugins are available via the existing import map:
```json
{
  "imports": {
    "markdown-plugins/": "https://cdn.jsdelivr.net/gh/lumeland/markdown-plugins@0.12.0/"
  }
}
```

## Testing Strategy

1. **Verify Backlinks**: Create interconnected notes and confirm bidirectional linking
2. **Test Footnotes**: Ensure proper rendering and navigation
3. **Validate TOC**: Check table of contents generation for structured notes
4. **Confirm Title Extraction**: Test automatic title detection

## Next Steps

1. Implement Phase 1 plugins
2. Update templates to display new features
3. Test with existing note catalog
4. Document usage patterns for content creators

---

*This plan is based on analysis of the current Catalog Web architecture and Zettelkasten system requirements.*