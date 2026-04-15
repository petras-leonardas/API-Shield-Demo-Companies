// CartNova Traffic Generator -- HTTP Utilities
// Wraps fetch with retry logic and error handling.
//
// Key design: retry on status 0 (connection failure) to handle
// Cloudflare Workers subrequest concurrency limits.

import { BASE_URL } from "./config";

export interface RequestResult {
  method: string;
  path: string;
  status: number;
  ok: boolean;
  duration: number;
}

const results: RequestResult[] = [];

/**
 * Make an HTTP request to the CartNova API.
 * No retries — move on quickly if a request fails. Over thousands
 * of Cron invocations, every endpoint will get hit successfully.
 */
export async function api<T = any>(
  method: string,
  path: string,
  options: {
    body?: Record<string, unknown>;
    token?: string;
    apiKey?: string;
    cookie?: string;
  } = {}
): Promise<T | null> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body) {
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

  const start = Date.now();

  try {
    const resp = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
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

/** Short delay between requests (50-200ms). */
export function humanDelay(): Promise<void> {
  const ms = 50 + Math.random() * 150;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pick a random element from an array. */
export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Pick N random elements from an array (no duplicates). */
export function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

/** Returns true with the given probability (0-1). */
export function chance(probability: number): boolean {
  return Math.random() < probability;
}

/** Random integer between min and max (inclusive). */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Get and reset the results log for this invocation. */
export function getResults(): RequestResult[] {
  const copy = [...results];
  results.length = 0;
  return copy;
}
