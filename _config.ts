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

export default site;
