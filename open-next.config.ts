import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/*
 * No incremental cache is configured: every page is rendered per request
 * (nonce-based CSP, see ADR 0005), so there is nothing to cache in R2.
 */
export default defineCloudflareConfig({});
