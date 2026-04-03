import lume from "lume/mod.ts";
import pagefind from "lume/plugins/pagefind.ts";
import markdown from "lume/plugins/markdown.ts";

// Configure Lume to use the 'catalog' directory as the source content directory
const site = lume({ src: "./" });

// Enable markdown processing with layout support
site.use(markdown());

// Enable PageFind full-text search plugin
site.use(pagefind({
  // default options can be overridden here
  // For example, customize UI container id:
  // ui: { containerId: "search" },
}));

export default site;
