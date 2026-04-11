/**
 * Twitter oEmbed plugin for Lume
 * Converts Twitter/X URLs to static HTML embeds during build
 */

interface TwitterOEmbedOptions {
  /** Cache directory for oEmbed responses */
  cacheDir?: string;
  /** Maximum width of embedded tweets */
  maxWidth?: number;
}

interface OEmbedResponse {
  url: string;
  author_name: string;
  author_url: string;
  html: string;
  width: number;
  height: number | null;
  type: string;
  cache_age: string;
  provider_name: string;
  provider_url: string;
  version: string;
}

/**
 * Fetch Twitter oEmbed data for a tweet URL
 */
async function fetchTwitterOEmbed(tweetUrl: string, options: TwitterOEmbedOptions = {}): Promise<OEmbedResponse> {
  const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true&maxwidth=${options.maxWidth || 550}`;
  
  try {
    const response = await fetch(oembedUrl);
    if (!response.ok) {
      throw new Error(`Twitter oEmbed API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json() as OEmbedResponse;
    return data;
  } catch (error) {
    console.error(`Failed to fetch Twitter oEmbed for ${tweetUrl}:`, error);
    // Return a fallback
    return {
      url: tweetUrl,
      author_name: "Twitter User",
      author_url: tweetUrl.split('/status')[0],
      html: `<blockquote class="twitter-tweet"><p>Failed to load tweet: ${tweetUrl}</p></blockquote>`,
      width: 550,
      height: null,
      type: "rich",
      cache_age: "0",
      provider_name: "Twitter",
      provider_url: "https://twitter.com",
      version: "1.0"
    };
  }
}

/**
 * Generate static HTML for a tweet embed
 */
function generateStaticTweetHtml(oembedData: OEmbedResponse): string {
  // Extract tweet content from the oEmbed HTML
  const tweetContent = oembedData.html
    .replace(/<blockquote[^>]*>|<\/blockquote>|<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();

  // Generate static HTML with basic styling
  const staticHtml = `
<div class="tweet-embed-static" style="
  border: 1px solid #e1e8ed; 
  border-radius: 12px; 
  padding: 16px; 
  margin: 16px 0; 
  background: #f7f9fa; 
  font-family: system-ui, -apple-system, sans-serif;
  max-width: ${oembedData.width}px;">
  
  <div style="display: flex; align-items: center; margin-bottom: 12px;">
    <div style="
      width: 48px; 
      height: 48px; 
      background: #1da1f2; 
      border-radius: 50%; 
      margin-right: 12px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      color: white; 
      font-weight: bold;
      font-size: 18px;">
      𝕏
    </div>
    <div>
      <div style="font-weight: bold; color: #14171a;">${oembedData.author_name}</div>
      <div style="font-size: 14px; color: #657786;">@${oembedData.author_url.split('/').pop()}</div>
    </div>
  </div>
  
  <div style="color: #14171a; line-height: 1.4; margin-bottom: 12px; font-size: 15px;">
    ${tweetContent}
  </div>
  
  <div style="
    font-size: 14px; 
    color: #657786; 
    border-top: 1px solid #e1e8ed; 
    padding-top: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;">
    <span>📅 ${new Date().toLocaleDateString()}</span>
    <a href="${oembedData.url}" 
       style="color: #1da1f2; text-decoration: none; font-weight: 500;" 
       target="_blank" 
       rel="noopener noreferrer">
      View on X →
    </a>
  </div>
</div>`;
  
  return staticHtml;
}

/**
 * Process markdown content to replace Twitter URLs with static embeds
 * Excludes URLs that appear in footnote definitions
 */
async function processTwitterEmbeds(content: string, options: TwitterOEmbedOptions = {}): Promise<string> {
  // Regex to match Twitter/X URLs
  const twitterUrlRegex = /https?:\/\/(?:twitter\.com|x\.com)\/[\w]+\/status\/(\d+)/g;
  
  // Regex to match footnote definitions (lines starting with [^X]:)
  const footnoteDefinitionRegex = /^\s*\[\^[^\]]+\]:.*$/gm;
  
  // Split content into lines
  const lines = content.split('\n');
  let processedLines: string[] = [];
  let inFootnoteDefinition = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line starts a footnote definition
    if (line.match(/^\s*\[\^[^\]]+\]:/)) {
      inFootnoteDefinition = true;
      processedLines.push(line); // Keep footnote definition as-is
      continue;
    }
    
    // If we're in a footnote definition block, check if this line continues it
    if (inFootnoteDefinition) {
      // Footnote definition continues if line starts with whitespace
      if (line.match(/^\s/) && line.trim() !== '') {
        processedLines.push(line); // Keep footnote content as-is
        continue;
      } else {
        // End of footnote definition
        inFootnoteDefinition = false;
      }
    }
    
    // Process Twitter URLs only if NOT in a footnote definition
    if (!inFootnoteDefinition) {
      const urlMatches = line.match(twitterUrlRegex);
      
      if (urlMatches) {
        // Use a Set to avoid duplicate API calls
        const uniqueUrls = [...new Set(urlMatches)];
        
        // Fetch oEmbed data for each unique URL
        const oembedPromises = uniqueUrls.map(url => fetchTwitterOEmbed(url, options));
        const oembedResults = await Promise.all(oembedPromises);
        
        // Create a mapping of URL to static HTML
        const urlToHtmlMap = new Map<string, string>();
        uniqueUrls.forEach((url, index) => {
          urlToHtmlMap.set(url, generateStaticTweetHtml(oembedResults[index]));
        });
        
        // Replace Twitter URLs with their static HTML
        let processedLine = line;
        processedLine = processedLine.replace(twitterUrlRegex, (match) => {
          return urlToHtmlMap.get(match) || match;
        });
        
        processedLines.push(processedLine);
      } else {
        processedLines.push(line);
      }
    } else {
      processedLines.push(line);
    }
  }
  
  return processedLines.join('\n');
}

export default function twitterOEmbedPlugin(options: TwitterOEmbedOptions = {}) {
  return (site: any) => {
    // Process markdown files before they're converted to HTML
    site.process([".md"], async (pages: any[]) => {
      for (const page of pages) {
        if (page.content) {
          page.content = await processTwitterEmbeds(page.content, options);
        }
      }
    });
  };
}
