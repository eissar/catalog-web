import lume from "lume/mod.ts";
import pagefind from "lume/plugins/pagefind.ts";
import markdown from "lume/plugins/markdown.ts";

// Configure Lume to use the 'catalog' directory as the source content directory
const site = lume({ src: "./catalog" });

// Enable markdown processing with layout support
site.use(markdown());

// PageFind plugin disabled for testing

export default site;
