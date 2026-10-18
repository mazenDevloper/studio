import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// DriveCast on Cloudflare Workers (OpenNext). The site's pages are prerendered at build time and served straight from
// Cloudflare's static assets (fast, nothing rendered per request); only the /api routes run code.
export default defineCloudflareConfig({ incrementalCache: staticAssetsIncrementalCache, enableCacheInterception: true });
