// Bot & Crawler Traffic Journey
// Simulates automated traffic from search engine crawlers, SEO tools,
// uptime monitors, and generic scrapers. Every production API gets this.
//
// Bot patterns:
//   - Search engine crawlers (Googlebot, Bingbot) hitting public pages
//   - SEO tools (Ahrefs) scanning the API surface
//   - Uptime monitors hitting health/status endpoints
//   - Generic scrapers trying to enumerate product data

import { PRODUCT_IDS, CATEGORY_IDS } from "../config";
import { api, burstDelay, humanDelay, pick, setClientProfile } from "../http";

/**
 * Search engine crawler -- hits public, crawlable endpoints.
 * Follows link-like patterns: home -> categories -> products.
 */
export async function searchCrawlerJourney(): Promise<void> {
  setClientProfile("bot");

  // Crawl the product catalog (like Googlebot indexing pages)
  await api("GET", "/api/v2/products?page=1&limit=20");
  await humanDelay();
  await api("GET", "/api/v2/categories");
  await humanDelay();

  // Crawl each category
  for (const catId of CATEGORY_IDS) {
    await api("GET", `/api/v2/categories/${catId}/products`);
    await humanDelay();
  }

  // Crawl individual products
  for (const prodId of PRODUCT_IDS.slice(0, 6)) {
    await api("GET", `/api/v2/products/${prodId}`);
    await burstDelay();
    await api("GET", `/api/v2/products/${prodId}/reviews`);
    await burstDelay();
  }
}

/**
 * SEO/security scanner -- probes the API surface more aggressively.
 * Tries common paths, checks for exposed endpoints.
 */
export async function scannerJourney(): Promise<void> {
  setClientProfile("bot");

  // Common paths that scanners check
  const probePaths = [
    "/robots.txt",
    "/sitemap.xml",
    "/.well-known/security.txt",
    "/api",
    "/api/v1",
    "/api/v2",
    "/api/v2/products",
    "/api/v2/categories",
    "/graphql",
    "/api/v2/admin",
    "/api/v2/internal",
    "/internal/health",
    "/internal/metrics",
    "/api/v2/swagger.json",
    "/api/v2/openapi.json",
    "/api/docs",
    "/.env",
    "/wp-admin",
    "/debug",
    "/api/v2/config",
  ];

  for (const path of probePaths) {
    await api("GET", path);
    await burstDelay();
  }
}

/**
 * Uptime monitor -- repeatedly checks health endpoints.
 * Simple, predictable pattern like Pingdom or UptimeRobot.
 */
export async function uptimeMonitorJourney(): Promise<void> {
  setClientProfile("bot");

  await api("GET", "/");
  await burstDelay();
  await api("GET", "/internal/health");
  await burstDelay();
  await api("GET", "/api/v2/products?limit=1");
  await burstDelay();
}

/**
 * Product scraper -- tries to enumerate all product data rapidly.
 * Burst pattern with minimal delays.
 */
export async function scraperJourney(): Promise<void> {
  setClientProfile("bot");

  // Rapid enumeration of products
  await api("GET", "/api/v2/products?page=1&limit=50");
  await burstDelay();
  await api("GET", "/api/v2/products?page=2&limit=50");
  await burstDelay();

  // Hit every product and its details
  for (const prodId of PRODUCT_IDS) {
    await api("GET", `/api/v2/products/${prodId}`);
    await burstDelay();
    await api("GET", `/api/v2/products/${prodId}/variants`);
    await burstDelay();
    await api("GET", `/api/v2/products/${prodId}/reviews`);
    await burstDelay();
  }

  // Try search with various terms
  const terms = ["*", "laptop", "cheap", "discount", "all", "1"];
  for (const term of terms) {
    await api("GET", `/api/v2/products/search?q=${encodeURIComponent(term)}`);
    await burstDelay();
  }
}
