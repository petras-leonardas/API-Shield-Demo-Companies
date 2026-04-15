// CartNova Webhook Routes -- 2 endpoints
// mTLS authentication is handled at the Cloudflare level, not in code.
// These endpoints accept POST requests from payment/shipping providers.

import { Hono } from "hono";

const app = new Hono();

// POST /api/v2/webhooks/payment -- Payment confirmation from provider
app.post("/payment", async (c) => {
  const body = await c.req.json();

  if (!body.event || !body.payment_id || !body.order_id) {
    return c.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "event, payment_id, and order_id are required",
        },
      },
      400
    );
  }

  const validEvents = [
    "payment.confirmed",
    "payment.failed",
    "payment.refunded",
  ];
  if (!validEvents.includes(body.event)) {
    return c.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: `Invalid event type. Valid types: ${validEvents.join(", ")}`,
        },
      },
      400
    );
  }

  return c.json({
    received: true,
    event: body.event,
    payment_id: body.payment_id,
    order_id: body.order_id,
    processed_at: new Date().toISOString(),
  });
});

// POST /api/v2/webhooks/shipping -- Shipping status update from carrier
app.post("/shipping", async (c) => {
  const body = await c.req.json();

  if (!body.event || !body.tracking_number || !body.order_id) {
    return c.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "event, tracking_number, and order_id are required",
        },
      },
      400
    );
  }

  const validEvents = [
    "shipment.created",
    "shipment.in_transit",
    "shipment.delivered",
  ];
  if (!validEvents.includes(body.event)) {
    return c.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: `Invalid event type. Valid types: ${validEvents.join(", ")}`,
        },
      },
      400
    );
  }

  return c.json({
    received: true,
    event: body.event,
    tracking_number: body.tracking_number,
    order_id: body.order_id,
    processed_at: new Date().toISOString(),
  });
});

export default app;
