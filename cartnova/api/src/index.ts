// CartNova API -- Main Entry Point
// Cloudflare Worker using Hono framework
//
// ~1,620 endpoints total:
//   37 hand-crafted core commerce endpoints (v2)
//   + ~1,584 generated endpoints across 16 business domains
//
// Core groups (hand-crafted, full business logic):
// - Products (8) -- public
// - Cart (4) -- JWT auth
// - Checkout (5) -- JWT auth, sequence flow
// - Users/Auth (6) -- mixed auth
// - Orders (4) -- JWT auth
// - Sellers (5) -- API key auth
// - Webhooks (2) -- mTLS (at Cloudflare level)
// - Internal (3) -- no auth (accidentally exposed)
//
// Generated groups (mock responses, realistic shapes):
// - Legacy Commerce (v1), Admin, Inventory, Marketing, Support,
//   Analytics, Finance, Logistics, Notifications, Content,
//   Search, Partners, Mobile, Platform, Internal/Ops

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import productRoutes from "./routes/products";
import categoryRoutes from "./routes/categories";
import cartRoutes from "./routes/cart";
import checkoutRoutes from "./routes/checkout";
import userRoutes from "./routes/users";
import orderRoutes from "./routes/orders";
import sellerRoutes from "./routes/sellers";
import webhookRoutes from "./routes/webhooks";
import internalRoutes from "./routes/internal";
import { createGeneratedRoutes } from "./generated/handler";

const app = new Hono();

// Global middleware
app.use("*", cors());
app.use("*", logger());

// ─── API Routes (v2) ───────────────────────────────────────────────

// Products & Categories (public, 8 endpoints)
app.route("/api/v2/products", productRoutes);
app.route("/api/v2/categories", categoryRoutes);

// User & Auth (mixed, 6 endpoints)
app.route("/api/v2", userRoutes);

// Cart (JWT auth, 4 endpoints)
app.route("/api/v2/cart", cartRoutes);

// Checkout (JWT auth, 5 endpoints -- sequence flow)
app.route("/api/v2/checkout", checkoutRoutes);

// Orders (JWT auth, 4 endpoints)
app.route("/api/v2/orders", orderRoutes);

// Sellers (API key auth, 5 endpoints)
app.route("/api/v2/sellers", sellerRoutes);

// Webhooks (mTLS at CF level, 2 endpoints)
app.route("/api/v2/webhooks", webhookRoutes);

// ─── Internal Routes (no auth -- "accidentally" exposed) ────────────
app.route("/internal", internalRoutes);

// ─── Generated Routes (~1,584 endpoints across 16 domains) ──────────
// These are mounted AFTER hand-crafted routes so the core commerce
// endpoints with full business logic take priority.
const generatedRoutes = createGeneratedRoutes();
app.route("/", generatedRoutes);

// ─── Root / Info ────────────────────────────────────────────────────

app.get("/", (c) => {
  return c.json({
    name: "CartNova API",
    version: "2.4.1",
    documentation: "https://docs.cartnova.example.com/api/v2",
    endpoints: {
      products: "/api/v2/products",
      categories: "/api/v2/categories",
      cart: "/api/v2/cart",
      checkout: "/api/v2/checkout",
      auth: "/api/v2/auth",
      users: "/api/v2/users",
      orders: "/api/v2/orders",
      sellers: "/api/v2/sellers",
      webhooks: "/api/v2/webhooks",
    },
  });
});

// ─── 404 Handler ────────────────────────────────────────────────────

app.notFound((c) => {
  return c.json(
    {
      error: {
        code: "NOT_FOUND",
        message: `Route ${c.req.method} ${c.req.path} not found`,
      },
    },
    404
  );
});

// ─── Error Handler ──────────────────────────────────────────────────

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      },
    },
    500
  );
});

export default app;
