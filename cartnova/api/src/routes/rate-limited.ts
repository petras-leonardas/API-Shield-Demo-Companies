// CartNova Rate-Limited Endpoints
//
// Endpoints that enforce rate limits and return 429 Too Many Requests.
// Useful for testing API Shield rate limiting rules.
//
// Two patterns:
// 1. /api/v2/rate-test/lenient  -- allows 10 req/min, then 429
// 2. /api/v2/rate-test/strict   -- allows 3 req/min, then 429
// 3. /api/v2/rate-test/status   -- always returns current rate limit info

import { Hono } from "hono";

const rateLimited = new Hono();

// In-memory rate counters (per-Worker instance, resets on cold start)
const counters: Record<string, { count: number; resetAt: number }> = {};

function checkRate(key: string, limit: number, windowMs: number): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  let entry = counters[key];

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    counters[key] = entry;
  }

  entry.count++;

  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

function rateHeaders(remaining: number, limit: number, resetAt: number): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
    "RateLimit-Policy": `${limit};w=60`,
  };
}

// Lenient endpoint: 10 requests per 60 seconds
rateLimited.all("/lenient", (c) => {
  const clientIp = c.req.header("X-Forwarded-For") || c.req.header("CF-Connecting-IP") || "unknown";
  const { allowed, remaining, resetAt } = checkRate(`lenient:${clientIp}`, 10, 60000);
  const headers = rateHeaders(remaining, 10, resetAt);

  if (!allowed) {
    return c.json(
      { error: { code: "RATE_LIMITED", message: "Rate limit exceeded. Try again later.", retry_after: Math.ceil((resetAt - Date.now()) / 1000) } },
      { status: 429, headers }
    );
  }

  return c.json(
    { message: "OK", endpoint: "lenient", requests_remaining: remaining },
    { status: 200, headers }
  );
});

// Strict endpoint: 3 requests per 60 seconds
rateLimited.all("/strict", (c) => {
  const clientIp = c.req.header("X-Forwarded-For") || c.req.header("CF-Connecting-IP") || "unknown";
  const { allowed, remaining, resetAt } = checkRate(`strict:${clientIp}`, 3, 60000);
  const headers = rateHeaders(remaining, 3, resetAt);

  if (!allowed) {
    return c.json(
      { error: { code: "RATE_LIMITED", message: "Strict rate limit exceeded.", retry_after: Math.ceil((resetAt - Date.now()) / 1000) } },
      { status: 429, headers }
    );
  }

  return c.json(
    { message: "OK", endpoint: "strict", requests_remaining: remaining },
    { status: 200, headers }
  );
});

// Status endpoint: always returns rate limit info without consuming quota
rateLimited.get("/status", (c) => {
  return c.json({
    endpoints: {
      "/api/v2/rate-test/lenient": { limit: 10, window: "60s" },
      "/api/v2/rate-test/strict": { limit: 3, window: "60s" },
    },
    description: "Test endpoints for API Shield rate limiting rules",
  });
});

export default rateLimited;
