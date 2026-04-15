// CartNova Checkout Routes -- 5 endpoints, all JWT auth
// PRIMARY SEQUENCE FLOW for sequence mitigation testing
// Contains PII in shipping/payment data for Sensitive Data Detection
//
// BOLA NOTE: checkout status endpoint does NOT check ownership --
// any authenticated user can view any checkout by ID.
// This is intentional for Vulnerability Scanner testing.

import { Hono } from "hono";
import { checkouts, getCartForUser } from "../data/seed";
import { jwtAuth } from "../middleware/jwt";

const app = new Hono();

app.use("/*", jwtAuth);

// POST /api/v2/checkout/start -- Initiate checkout from current cart
app.post("/start", (c) => {
  const userId = c.get("userId");
  const cart = getCartForUser(userId);

  if (cart.items.length === 0) {
    return c.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Cart is empty. Add items before starting checkout.",
        },
      },
      400
    );
  }

  const checkoutId = `chk_${Date.now().toString(36).slice(-8)}`;

  return c.json(
    {
      id: checkoutId,
      user_id: userId,
      items: cart.items,
      subtotal: cart.subtotal,
      currency: cart.currency,
      shipping: null,
      payment: null,
      status: "started",
      created_at: new Date().toISOString(),
    },
    201
  );
});

// PUT /api/v2/checkout/:checkout_id/shipping -- Set shipping address
// Request contains PII: name, address, phone
app.put("/:checkout_id/shipping", async (c) => {
  const checkoutId = c.req.param("checkout_id");
  const body = await c.req.json();

  if (!body.name || !body.address_line_1 || !body.city || !body.postal_code || !body.country) {
    return c.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "name, address_line_1, city, postal_code, and country are required",
        },
      },
      400
    );
  }

  // Check seed data first
  const existing = checkouts.find((ch) => ch.id === checkoutId);

  return c.json({
    id: checkoutId,
    status: "shipping_set",
    shipping: {
      name: body.name,
      address_line_1: body.address_line_1,
      address_line_2: body.address_line_2 || null,
      city: body.city,
      postal_code: body.postal_code,
      country: body.country,
      phone: body.phone || null,
    },
    payment: existing?.payment || null,
    updated_at: new Date().toISOString(),
  });
});

// PUT /api/v2/checkout/:checkout_id/payment -- Set payment method
// Request contains financial data: card token, billing address
app.put("/:checkout_id/payment", async (c) => {
  const checkoutId = c.req.param("checkout_id");
  const body = await c.req.json();

  if (!body.payment_method || !body.card_token) {
    return c.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "payment_method and card_token are required",
        },
      },
      400
    );
  }

  const existing = checkouts.find((ch) => ch.id === checkoutId);

  return c.json({
    id: checkoutId,
    status: "payment_set",
    shipping: existing?.shipping || null,
    payment: {
      payment_method: body.payment_method,
      card_token: body.card_token,
      last_four: body.card_token.slice(-4),
      billing_address: body.billing_address || null,
    },
    updated_at: new Date().toISOString(),
  });
});

// POST /api/v2/checkout/:checkout_id/confirm -- Place the order
app.post("/:checkout_id/confirm", (c) => {
  const checkoutId = c.req.param("checkout_id");
  const existing = checkouts.find((ch) => ch.id === checkoutId);

  // In a real app, we'd verify shipping and payment are set
  const orderId = `ord_${Date.now().toString(36).slice(-6)}`;

  return c.json({
    checkout_id: checkoutId,
    order_id: orderId,
    status: "confirmed",
    message: "Order placed successfully",
    items: existing?.items || [],
    total: existing?.subtotal || 0,
    currency: existing?.currency || "EUR",
    confirmed_at: new Date().toISOString(),
  });
});

// GET /api/v2/checkout/:checkout_id/status -- Check checkout/order status
// INTENTIONAL BOLA VULNERABILITY: does NOT verify the checkout belongs to the
// authenticated user. Any authenticated user can check any checkout's status.
// The Vulnerability Scanner should flag this.
app.get("/:checkout_id/status", (c) => {
  const checkoutId = c.req.param("checkout_id");
  const existing = checkouts.find((ch) => ch.id === checkoutId);

  if (!existing) {
    return c.json(
      {
        error: { code: "NOT_FOUND", message: "Checkout not found" },
      },
      404
    );
  }

  return c.json({
    id: existing.id,
    status: existing.status,
    items: existing.items,
    subtotal: existing.subtotal,
    currency: existing.currency,
    shipping: existing.shipping,
    created_at: existing.created_at,
  });
});

export default app;
