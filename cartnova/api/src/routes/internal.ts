// CartNova Internal Routes -- 3 endpoints, NO AUTH
// These are "accidentally" publicly accessible.
// Should be flagged by Authentication Posture (cf-risk-missing-auth)

import { Hono } from "hono";

const app = new Hono();

// GET /internal/health -- Health check
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    service: "cartnova-api",
    version: "2.4.1",
    uptime_seconds: 847293,
    timestamp: new Date().toISOString(),
    dependencies: {
      database: "connected",
      cache: "connected",
      payment_gateway: "connected",
      search_engine: "connected",
    },
  });
});

// GET /internal/metrics -- Prometheus-style metrics
app.get("/metrics", (c) => {
  // Returns operational data that shouldn't be public
  return c.json({
    http_requests_total: 1284567,
    http_requests_errors: 2341,
    error_rate: 0.0018,
    avg_response_time_ms: 45,
    p99_response_time_ms: 230,
    active_connections: 127,
    endpoints: {
      "/api/v2/products": { requests: 456789, avg_ms: 12 },
      "/api/v2/products/search": { requests: 234567, avg_ms: 38 },
      "/api/v2/cart": { requests: 123456, avg_ms: 22 },
      "/api/v2/checkout/start": { requests: 45678, avg_ms: 67 },
      "/api/v2/checkout/confirm": { requests: 34567, avg_ms: 145 },
    },
    cache: {
      hit_rate: 0.87,
      size_mb: 256,
      evictions_24h: 1234,
    },
    timestamp: new Date().toISOString(),
  });
});

// POST /internal/cache/invalidate -- Bust product cache
app.post("/cache/invalidate", async (c) => {
  const body = await c.req.json().catch(() => ({}));

  return c.json({
    invalidated: true,
    scope: body.scope || "all",
    keys_cleared: body.keys ? body.keys.length : 4567,
    timestamp: new Date().toISOString(),
    warning:
      "Cache invalidation affects all edge nodes. Full repopulation takes ~5 minutes.",
  });
});

export default app;
