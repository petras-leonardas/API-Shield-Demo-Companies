// CartNova Traffic Generator -- HTTP Utilities
// Realistic request simulation with proper User-Agents, referrers,
// query variations, and headers that match production traffic patterns.
//
// KEY FIXES from dashboard analysis:
// - All requests get explicit UA (no more "node" default leaking)
// - Mobile UAs are real browser strings (iPhone Safari, Android Chrome)
//   so Cloudflare classifies them correctly as mobile devices
// - Referrer rotation: Google, social, email, internal, direct
// - X-Requested-With: XMLHttpRequest on browser Ajax requests
// - Query string helpers for varied pagination, sorting, filtering

import { BASE_URL } from "./config";

export interface RequestResult {
  method: string;
  path: string;
  status: number;
  ok: boolean;
  duration: number;
}

const results: RequestResult[] = [];

// ── User-Agent Pool ─────────────────────────────────────────────────
// All UAs are real browser/app strings that Cloudflare's parser recognizes.

const USER_AGENTS = {
  // Desktop browsers (45% of traffic)
  desktop: [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  ],
  // Mobile browsers (40% of traffic) — REAL mobile browser UAs that
  // Cloudflare classifies as mobile devices with correct OS detection
  mobile: [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.73 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; SM-S926B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.73 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.73 Mobile Safari/537.36",
    "Mozilla/5.0 (iPad; CPU OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; Redmi Note 13 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.73 Mobile Safari/537.36",
  ],
  // Integration/API clients (5%)
  integration: [
    "python-requests/2.31.0",
    "axios/1.7.2",
    "Go-http-client/2.0",
    "okhttp/4.12.0",
  ],
  // Developer tools (2%)
  developer: [
    "PostmanRuntime/7.36.0",
    "Insomnia/2024.7.0",
    "curl/8.7.1",
    "httpie/3.2.2",
  ],
  // Bots/crawlers (8%)
  bot: [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
    "Pingdom.com_bot_version_1.4_(http://www.pingdom.com/)",
    "UptimeRobot/2.0",
    "Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)",
  ],
};

// ── Referrer Pool ───────────────────────────────────────────────────
// Weighted to match realistic e-commerce referral sources.

const REFERRERS = {
  // Search engines (30% of referrals)
  search: [
    "https://www.google.com/",
    "https://www.google.nl/",
    "https://www.google.de/",
    "https://www.google.es/",
    "https://www.google.fr/",
    "https://www.google.co.uk/",
    "https://www.bing.com/",
    "https://duckduckgo.com/",
  ],
  // Social media (10%)
  social: [
    "https://www.facebook.com/",
    "https://www.instagram.com/",
    "https://www.tiktok.com/",
    "https://twitter.com/",
    "https://www.pinterest.com/",
    "https://www.reddit.com/",
  ],
  // Email campaigns (5%)
  email: [
    "https://email.carnova.uk/campaign/summer-sale",
    "https://email.carnova.uk/campaign/new-arrivals",
    "https://email.carnova.uk/campaign/weekly-deals",
    "https://email.carnova.uk/newsletter/2024-11",
  ],
  // Partner/affiliate sites (5%)
  partner: [
    "https://deals.example.com/cartnova",
    "https://www.pricewatch.nl/",
    "https://www.idealo.de/",
    "https://www.shopzilla.com/",
    "https://kelkoo.com/",
  ],
  // Internal (25%)
  internal: [
    "https://carnova.uk/",
    "https://carnova.uk/category.html",
    "https://carnova.uk/product.html",
    "https://carnova.uk/cart.html",
    "https://carnova.uk/checkout.html",
    "https://carnova.uk/orders.html",
    "https://carnova.uk/account.html",
  ],
};

function getWeightedReferrer(): string | null {
  const roll = Math.random();
  if (roll < 0.25) return null; // 25% direct (no referrer)
  if (roll < 0.55) return pickFrom(REFERRERS.search); // 30% search
  if (roll < 0.80) return pickFrom(REFERRERS.internal); // 25% internal
  if (roll < 0.90) return pickFrom(REFERRERS.social); // 10% social
  if (roll < 0.95) return pickFrom(REFERRERS.email); // 5% email
  return pickFrom(REFERRERS.partner); // 5% partner
}

function pickFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Accept-Language Pool ────────────────────────────────────────────

const LANGUAGES = [
  "en-US,en;q=0.9",
  "en-GB,en;q=0.9",
  "nl-NL,nl;q=0.9,en;q=0.8",
  "de-DE,de;q=0.9,en;q=0.8",
  "es-ES,es;q=0.9,en;q=0.8",
  "fr-FR,fr;q=0.9,en;q=0.8",
  "it-IT,it;q=0.9,en;q=0.8",
  "pt-PT,pt;q=0.9,en;q=0.8",
];

// ── Client Profile ──────────────────────────────────────────────────

type ClientProfile = "desktop" | "mobile" | "integration" | "developer" | "bot";

let currentProfile: ClientProfile = "desktop";

export function setClientProfile(profile: ClientProfile): void {
  currentProfile = profile;
}

/** Weighted random profile: 45% desktop, 40% mobile, 5% integration, 2% developer, 8% bot */
export function randomClientProfile(): ClientProfile {
  const roll = Math.random();
  if (roll < 0.45) return "desktop";
  if (roll < 0.85) return "mobile";
  if (roll < 0.90) return "integration";
  if (roll < 0.92) return "developer";
  return "bot";
}

function getUA(): string {
  const pool = USER_AGENTS[currentProfile];
  return pool[Math.floor(Math.random() * pool.length)];
}

function requestId(): string {
  return `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ── Simulated source IPs ────────────────────────────────────────────

function simulatedIP(): string {
  const subnets = [
    "82.132", "85.145", "91.204", "94.212", "109.36",
    "46.114", "78.42", "87.128", "91.65", "95.90",
    "83.37", "88.6", "95.120", "176.83", "213.98",
    "80.15", "86.249", "90.84", "109.190", "176.144",
    "82.12", "86.150", "90.193", "109.148", "176.248",
  ];
  const subnet = subnets[Math.floor(Math.random() * subnets.length)];
  return `${subnet}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;
}

// ── Core API Function ───────────────────────────────────────────────

export async function api<T = any>(
  method: string,
  path: string,
  options: {
    body?: Record<string, unknown> | string;
    token?: string;
    apiKey?: string;
    cookie?: string;
    rawHeaders?: Record<string, string>;
    skipRealisticHeaders?: boolean;
  } = {}
): Promise<T | null> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {};

  // ALWAYS set a User-Agent — never let "node" default through
  headers["User-Agent"] = getUA();
  headers["Accept"] = "application/json";

  if (!options.skipRealisticHeaders) {
    headers["Accept-Language"] = LANGUAGES[Math.floor(Math.random() * LANGUAGES.length)];
    headers["X-Request-ID"] = requestId();
    headers["X-Forwarded-For"] = simulatedIP();

    // Referrer (weighted distribution)
    const referrer = getWeightedReferrer();
    if (referrer) {
      headers["Referer"] = referrer;
    }

    // Browser/mobile requests include X-Requested-With (Ajax)
    if (currentProfile === "desktop" || currentProfile === "mobile") {
      headers["X-Requested-With"] = "XMLHttpRequest";
    }

    // Some requests include Origin header
    if (method !== "GET" && (currentProfile === "desktop" || currentProfile === "mobile")) {
      headers["Origin"] = "https://carnova.uk";
    }
  }

  if (typeof options.body === "object" && options.body !== null) {
    headers["Content-Type"] = "application/json";
  }
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }
  if (options.apiKey) {
    headers["X-Seller-Key"] = options.apiKey;
  }
  if (options.cookie) {
    headers["Cookie"] = options.cookie;
  }

  if (options.rawHeaders) {
    Object.assign(headers, options.rawHeaders);
  }

  const start = Date.now();

  try {
    const resp = await fetch(url, {
      method,
      headers,
      body: typeof options.body === "string"
        ? options.body
        : options.body
          ? JSON.stringify(options.body)
          : undefined,
    });

    const duration = Date.now() - start;
    results.push({ method, path, status: resp.status, ok: resp.ok, duration });

    if (!resp.ok) return null;

    const data = (await resp.json()) as T;
    return data;
  } catch {
    const duration = Date.now() - start;
    results.push({ method, path, status: 0, ok: false, duration });
    return null;
  }
}

// ── JWT Token Cache ─────────────────────────────────────────────────
// Reduces login endpoint dominance by reusing tokens across journeys.

const tokenCache: Map<string, { token: string; expiresAt: number }> = new Map();

export async function getOrLogin(email: string, password: string): Promise<string | null> {
  const cached = tokenCache.get(email);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const resp = await api<{ access_token: string }>("POST", "/api/v2/auth/login", {
    body: { email, password },
  });

  if (resp?.access_token) {
    // Cache for 10 minutes (tokens expire in 15)
    tokenCache.set(email, {
      token: resp.access_token,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    return resp.access_token;
  }
  return null;
}

// ── Query String Helpers ────────────────────────────────────────────
// Generate varied query parameters for more realistic URLs.

const SORT_OPTIONS = ["price_asc", "price_desc", "rating", "newest", "popularity", "name_asc"];
const FILTER_BRANDS = ["NordicWear", "TechVault", "HomeEssence", "AeroPress", "ProVision"];

export function randomSort(): string {
  return `sort=${pickFrom(SORT_OPTIONS)}`;
}

export function randomPagination(): string {
  const page = Math.floor(Math.random() * 5) + 1;
  const limit = pickFrom([10, 12, 20, 24, 50]);
  return `page=${page}&limit=${limit}`;
}

export function randomFilters(): string {
  const filters: string[] = [];
  if (Math.random() < 0.4) filters.push(`min_price=${Math.floor(Math.random() * 50)}`);
  if (Math.random() < 0.4) filters.push(`max_price=${50 + Math.floor(Math.random() * 500)}`);
  if (Math.random() < 0.3) filters.push(`in_stock=true`);
  if (Math.random() < 0.2) filters.push(`brand=${pickFrom(FILTER_BRANDS)}`);
  if (Math.random() < 0.3) filters.push(randomSort());
  return filters.join("&");
}

export function randomSearchParams(query: string): string {
  const params = [`q=${encodeURIComponent(query)}`];
  if (Math.random() < 0.3) params.push(randomSort());
  if (Math.random() < 0.3) params.push(`category=${pickFrom(["electronics", "clothing", "home", "sports"])}`);
  if (Math.random() < 0.2) params.push(`min_price=${Math.floor(Math.random() * 30)}`);
  return params.join("&");
}

// ── Delay Functions ─────────────────────────────────────────────────

export function humanDelay(): Promise<void> {
  const ms = 50 + Math.random() * 150;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function burstDelay(): Promise<void> {
  const ms = 5 + Math.random() * 25;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Utility Functions ───────────────────────────────────────────────

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

export function chance(probability: number): boolean {
  return Math.random() < probability;
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getResults(): RequestResult[] {
  const copy = [...results];
  results.length = 0;
  return copy;
}
