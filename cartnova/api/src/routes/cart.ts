// CartNova Cart Routes -- 4 endpoints, all JWT auth
// Cart is tied to the authenticated user (no BOLA vulnerability here)

import { Hono } from "hono";
import { getCartForUser, products, variants } from "../data/seed";
import { jwtAuth } from "../middleware/jwt";

const app = new Hono();

// Apply JWT auth to all cart routes
app.use("/*", jwtAuth);

// GET /api/v2/cart -- View current cart
app.get("/", (c) => {
  const userId = c.get("userId");
  const cart = getCartForUser(userId);

  // Enrich cart items with product images
  const enrichedItems = cart.items.map((item) => {
    const product = products.find((p) => p.id === item.product_id);
    return {
      ...item,
      image: product?.images?.[0] || null,
    };
  });

  return c.json({
    ...cart,
    items: enrichedItems,
  });
});

// POST /api/v2/cart/items -- Add item to cart
app.post("/items", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();

  if (!body.product_id || !body.quantity) {
    return c.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "product_id and quantity are required",
        },
      },
      400
    );
  }

  const product = products.find((p) => p.id === body.product_id);
  if (!product) {
    return c.json(
      {
        error: { code: "NOT_FOUND", message: "Product not found" },
      },
      404
    );
  }

  let variantName = "";
  if (body.variant_id) {
    const variant = variants.find((v) => v.id === body.variant_id);
    if (variant) {
      variantName = ` - ${variant.name}`;
    }
  }

  const cart = getCartForUser(userId);
  const newItem = {
    id: `ci_${Date.now().toString(36).slice(-8)}`,
    product_id: body.product_id,
    variant_id: body.variant_id || null,
    product_name: `${product.name}${variantName}`,
    quantity: body.quantity,
    price: product.price,
    currency: product.currency,
  };

  // Return updated cart with the new item added
  return c.json(
    {
      user_id: userId,
      items: [...cart.items, newItem],
      subtotal: cart.subtotal + product.price * body.quantity,
      currency: "EUR",
      item_count: cart.item_count + 1,
    },
    201
  );
});

// PUT /api/v2/cart/items/:item_id -- Update item quantity
app.put("/items/:item_id", async (c) => {
  const userId = c.get("userId");
  const itemId = c.req.param("item_id");
  const body = await c.req.json();

  if (body.quantity === undefined) {
    return c.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "quantity is required",
        },
      },
      400
    );
  }

  const cart = getCartForUser(userId);
  const item = cart.items.find((i) => i.id === itemId);

  if (!item) {
    return c.json(
      {
        error: { code: "NOT_FOUND", message: "Cart item not found" },
      },
      404
    );
  }

  // Return cart with updated quantity
  const updatedItems = cart.items.map((i) =>
    i.id === itemId ? { ...i, quantity: body.quantity } : i
  );

  const newSubtotal = updatedItems.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  return c.json({
    user_id: userId,
    items: updatedItems,
    subtotal: Math.round(newSubtotal * 100) / 100,
    currency: "EUR",
    item_count: updatedItems.length,
  });
});

// DELETE /api/v2/cart/items/:item_id -- Remove item from cart
app.delete("/items/:item_id", (c) => {
  const userId = c.get("userId");
  const itemId = c.req.param("item_id");

  const cart = getCartForUser(userId);
  const item = cart.items.find((i) => i.id === itemId);

  if (!item) {
    return c.json(
      {
        error: { code: "NOT_FOUND", message: "Cart item not found" },
      },
      404
    );
  }

  const remainingItems = cart.items.filter((i) => i.id !== itemId);
  const newSubtotal = remainingItems.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  return c.json({
    user_id: userId,
    items: remainingItems,
    subtotal: Math.round(newSubtotal * 100) / 100,
    currency: "EUR",
    item_count: remainingItems.length,
  });
});

export default app;
