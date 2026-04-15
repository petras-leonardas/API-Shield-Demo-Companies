// CartNova Traffic Generator -- HTTP Utilities
// Realistic request simulation with varied User-Agents, request IDs,
// languages, and referrers to match production traffic patterns.

import { BASE_URL } from "./config";

export interface RequestResult {
  method: string;
  path: string;
  status: number;
  ok: boolean;
  duration: number;
}

const results: RequestResult[] = [];

// ── Realistic User-Agent Rotation ───────────────────────────────────

const USER_AGENTS = {
  // Web browsers (60% of traffic)
  browser: [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  ],
  // Mobile apps (20% of traffic)
  mobile: [
    "CartNova-iOS/3.2.1 (iPhone; iOS 18.1; Scale/3.0)",
    "CartNova-Android/2.8.0 (Pixel 8; Android 15; Build/AP3A)",
    "CartNova-iOS/3.1.9 (iPad; iPadOS 18.1; Scale/2.0)",
    "CartNova-Android/2.7.5 (Samsung Galaxy S24; Android 14)",
  ],
  // Partner/integration scripts (10% of traffic)
  integration: [
    "python-requests/2.31.0",
    "axios/1.7.2",
    "CartNova-Partner-SDK/1.4.0 (Node.js)",
    "CartNova-Webhook-Client/1.0.2",
  ],
  // Developer tools (5% of traffic)
  developer: [
    "PostmanRuntime/7.36.0",
    "Insomnia/2024.7.0",
    "curl/8.7.1",
    "httpie/3.2.2",
  ],
  // Bots/crawlers (5% of traffic)
  bot: [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
    "Pingdom.com_bot_version_1.4_(http://www.pingdom.com/)",
    "UptimeRobot/2.0",
  ],
};

const LANGUAGES = [
  "en-US,en;q=0.9",
  "nl-NL,nl;q=0.9,en;q=0.8",
  "de-DE,de;q=0.9,en;q=0.8",
  "es-ES,es;q=0.9,en;q=0.8",
  "fr-FR,fr;q=0.9,en;q=0.8",
  "en-GB,en;q=0.9",
];

/** Current client profile for this session (set per journey). */
let currentProfile: "browser" | "mobile" | "integration" | "developer" | "bot" = "browser";

/** Set the client profile for subsequent requests. */
export function setClientProfile(profile: typeof currentProfile): void {
  currentProfile = profile;
}

/** Pick a random client profile weighted by realistic distribution. */
export function randomClientProfile(): typeof currentProfile {
  const roll = Math.random();
  if (roll < 0.60) return "browser";
  if (roll < 0.80) return "mobile";
  if (roll < 0.90) return "integration";
  if (roll < 0.95) return "developer";
  return "bot";
}

function getUA(): string {
  const pool = USER_AGENTS[currentProfile];
  return pool[Math.floor(Math.random() * pool.length)];
}

function requestId(): string {
  return `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ── Simulated source IPs for X-Forwarded-For ────────────────────────
// These create the appearance of diverse client origins in analytics.

function simulatedIP(): string {
  const subnets = [
    // European ISPs (matching CartNova's user base)
    "82.132", "85.145", "91.204", "94.212", "109.36",   // NL
    "46.114", "78.42", "87.128", "91.65", "95.90",      // DE
    "83.37", "88.6", "95.120", "176.83", "213.98",      // ES
    "80.15", "86.249", "90.84", "109.190", "176.144",   // FR
    "82.12", "86.150", "90.193", "109.148", "176.248",  // UK
  ];
  const subnet = subnets[Math.floor(Math.random() * subnets.length)];
  return `${subnet}.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;
}

// ── Core API Function ───────────────────────────────────────────────

/**
 * Make an HTTP request to the CartNova API with realistic headers.
 */
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

  // Realistic headers (unless explicitly skipped for raw/malformed requests)
  if (!options.skipRealisticHeaders) {
    headers["User-Agent"] = getUA();
    headers["Accept"] = "application/json";
    headers["Accept-Language"] = LANGUAGES[Math.floor(Math.random() * LANGUAGES.length)];
    headers["X-Request-ID"] = requestId();
    headers["X-Forwarded-For"] = simulatedIP();

    // Browser requests include Referer
    if (currentProfile === "browser") {
      headers["Referer"] = `https://carnova.uk/`;
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

  // Merge any raw/custom headers (for malformed request simulation)
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

// ── Delay Functions ─────────────────────────────────────────────────

/** Normal human delay (50-200ms). */
export function humanDelay(): Promise<void> {
  const ms = 50 + Math.random() * 150;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Burst mode — nearly instant (5-30ms). */
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
