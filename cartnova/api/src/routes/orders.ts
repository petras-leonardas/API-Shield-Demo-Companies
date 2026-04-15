// CartNova Order Routes -- 4 endpoints, all JWT auth
// Contains PII in shipping data and financial info in payment data
//
// BOLA NOTE: GET /orders/:order_id does NOT check ownership --
// any authenticated user can view any order by ID.
// GET /orders (list) correctly filters by the authenticated user.

import { Hono } from "hono";
import { orders, getOrdersForUser } from "../data/seed";
import { jwtAuth } from "../middleware/jwt";

const app = new Hono();

app.use("/*", jwtAuth);

// GET /api/v2/orders -- Order history (filtered by authenticated user)
app.get("/", (c) => {
  const userId = c.get("userId");
  const userOrders = getOrdersForUser(userId);

  return c.json({
    orders: userOrders.map((o) => ({
      id: o.id,
      status: o.status,
      item_count: o.items.length,
      total: o.payment.amount,
      currency: o.payment.currency,
      created_at: o.created_at,
    })),
    total: userOrders.length,
  });
});

// GET /api/v2/orders/:order_id -- Order detail
// INTENTIONAL BOLA VULNERABILITY: does NOT check that the order belongs
// to the authenticated user. Any authenticated user can access any order.
app.get("/:order_id", (c) => {
  const orderId = c.req.param("order_id");
  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    return c.json(
      {
        error: { code: "NOT_FOUND", message: "Order not found" },
      },
      404
    );
  }

  // Returns full PII: shipping name, address, phone + payment details
  return c.json({
    id: order.id,
    status: order.status,
    items: order.items,
    shipping: order.shipping,
    payment: order.payment,
    created_at: order.created_at,
  });
});

// GET /api/v2/orders/:order_id/tracking -- Shipping tracking
// Also BOLA vulnerable (no ownership check)
app.get("/:order_id/tracking", (c) => {
  const orderId = c.req.param("order_id");
  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    return c.json(
      {
        error: { code: "NOT_FOUND", message: "Order not found" },
      },
      404
    );
  }

  if (!order.tracking) {
    return c.json({
      order_id: orderId,
      status: "processing",
      message: "Tracking information not yet available",
    });
  }

  return c.json({
    order_id: orderId,
    carrier: order.tracking.carrier,
    tracking_number: order.tracking.tracking_number,
    status: order.tracking.status,
    updates: order.tracking.updates,
  });
});

// POST /api/v2/orders/:order_id/return -- Initiate return
app.post("/:order_id/return", async (c) => {
  const orderId = c.req.param("order_id");
  const userId = c.get("userId");
  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    return c.json(
      {
        error: { code: "NOT_FOUND", message: "Order not found" },
      },
      404
    );
  }

  if (order.status !== "delivered") {
    return c.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Only delivered orders can be returned",
        },
      },
      400
    );
  }

  const body = await c.req.json();

  return c.json(
    {
      return_id: `ret_${Date.now().toString(36).slice(-6)}`,
      order_id: orderId,
      status: "return_initiated",
      reason: body.reason || "Not specified",
      items: body.items || order.items,
      created_at: new Date().toISOString(),
      instructions:
        "Please ship the items back within 14 days using the prepaid label sent to your email.",
    },
    201
  );
});

export default app;
