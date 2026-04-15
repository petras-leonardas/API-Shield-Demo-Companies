// CartNova Seller Routes -- 5 endpoints, all API key auth (X-Seller-Key)
// Returns business-sensitive data (revenue, analytics)

import { Hono } from "hono";
import { products, orders, sellerAnalytics } from "../data/seed";
import { apiKeyAuth } from "../middleware/apikey";

const app = new Hono();

app.use("/*", apiKeyAuth);

// GET /api/v2/sellers/me/products -- List seller's product listings
app.get("/me/products", (c) => {
  const sellerId = c.get("sellerId");
  const sellerProducts = products.filter((p) => p.seller_id === sellerId);

  return c.json({
    products: sellerProducts.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency,
      category_id: p.category_id,
      in_stock: p.in_stock,
      rating: p.rating,
      review_count: p.review_count,
      created_at: p.created_at,
    })),
    total: sellerProducts.length,
  });
});

// POST /api/v2/sellers/me/products -- Create a new listing
app.post("/me/products", async (c) => {
  const sellerId = c.get("sellerId");
  const body = await c.req.json();

  if (!body.name || !body.price || !body.category_id) {
    return c.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "name, price, and category_id are required",
        },
      },
      400
    );
  }

  return c.json(
    {
      id: `prod_${Date.now().toString(36).slice(-6)}`,
      name: body.name,
      description: body.description || "",
      price: body.price,
      currency: body.currency || "EUR",
      category_id: body.category_id,
      seller_id: sellerId,
      images: body.images || [],
      rating: 0,
      review_count: 0,
      in_stock: true,
      created_at: new Date().toISOString(),
    },
    201
  );
});

// PUT /api/v2/sellers/me/products/:product_id -- Update a listing
app.put("/me/products/:product_id", async (c) => {
  const sellerId = c.get("sellerId");
  const productId = c.req.param("product_id");
  const product = products.find(
    (p) => p.id === productId && p.seller_id === sellerId
  );

  if (!product) {
    return c.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Product not found or does not belong to this seller",
        },
      },
      404
    );
  }

  const body = await c.req.json();

  return c.json({
    id: product.id,
    name: body.name || product.name,
    description: body.description || product.description,
    price: body.price || product.price,
    currency: product.currency,
    category_id: body.category_id || product.category_id,
    seller_id: sellerId,
    in_stock: body.in_stock !== undefined ? body.in_stock : product.in_stock,
    updated_at: new Date().toISOString(),
  });
});

// GET /api/v2/sellers/me/analytics -- Sales dashboard data
app.get("/me/analytics", (c) => {
  const sellerId = c.get("sellerId");
  const analytics = sellerAnalytics.get(sellerId);

  if (!analytics) {
    return c.json({
      seller_id: sellerId,
      period: "2024-11",
      revenue: 0,
      order_count: 0,
      top_products: [],
    });
  }

  return c.json(analytics);
});

// GET /api/v2/sellers/me/orders -- Orders for seller's products
app.get("/me/orders", (c) => {
  const sellerId = c.get("sellerId");
  const sellerProductIds = products
    .filter((p) => p.seller_id === sellerId)
    .map((p) => p.id);

  const sellerOrders = orders.filter((o) =>
    o.items.some((item) => sellerProductIds.includes(item.product_id))
  );

  return c.json({
    orders: sellerOrders.map((o) => ({
      id: o.id,
      status: o.status,
      items: o.items.filter((item) =>
        sellerProductIds.includes(item.product_id)
      ),
      total: o.payment.amount,
      currency: o.payment.currency,
      created_at: o.created_at,
    })),
    total: sellerOrders.length,
  });
});

export default app;
