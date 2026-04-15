// CartNova Product Routes -- 8 endpoints, all public (no auth)
// High traffic volume. Primary target for rate limiting on search.

import { Hono } from "hono";
import { products, categories, variants, reviews } from "../data/seed";
import { jwtAuth } from "../middleware/jwt";

const app = new Hono();

// GET /api/v2/products -- List/filter products
// Supports ?q=, ?category=, ?page=, ?limit=
app.get("/", (c) => {
  const q = c.req.query("q")?.toLowerCase();
  const categoryFilter = c.req.query("category");
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");

  let filtered = products;

  if (q) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }

  if (categoryFilter) {
    filtered = filtered.filter((p) => p.category_id === categoryFilter);
  }

  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return c.json({
    products: paginated.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency,
      category_id: p.category_id,
      rating: p.rating,
      review_count: p.review_count,
      in_stock: p.in_stock,
      image: p.images[0] || null,
    })),
    pagination: {
      page,
      limit,
      total: filtered.length,
      total_pages: Math.ceil(filtered.length / limit),
    },
  });
});

// GET /api/v2/products/search -- Full-text search
// Supports ?q=, ?min_price=, ?max_price=
app.get("/search", (c) => {
  const q = c.req.query("q")?.toLowerCase();
  const minPrice = parseFloat(c.req.query("min_price") || "0");
  const maxPrice = parseFloat(c.req.query("max_price") || "999999");

  if (!q) {
    return c.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Query parameter 'q' is required",
        },
      },
      400
    );
  }

  const results = products.filter(
    (p) =>
      (p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)) &&
      p.price >= minPrice &&
      p.price <= maxPrice
  );

  return c.json({
    query: q,
    results: results.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency,
      category_id: p.category_id,
      rating: p.rating,
      in_stock: p.in_stock,
      image: p.images[0] || null,
    })),
    total: results.length,
  });
});

// GET /api/v2/products/:product_id -- Product detail
app.get("/:product_id", (c) => {
  const productId = c.req.param("product_id");
  const product = products.find((p) => p.id === productId);

  if (!product) {
    return c.json(
      {
        error: { code: "NOT_FOUND", message: "Product not found" },
      },
      404
    );
  }

  const productVariants = variants.filter((v) => v.product_id === productId);

  return c.json({
    ...product,
    variants: productVariants,
  });
});

// GET /api/v2/products/:product_id/reviews -- Product reviews
app.get("/:product_id/reviews", (c) => {
  const productId = c.req.param("product_id");
  const product = products.find((p) => p.id === productId);

  if (!product) {
    return c.json(
      {
        error: { code: "NOT_FOUND", message: "Product not found" },
      },
      404
    );
  }

  const productReviews = reviews.filter((r) => r.product_id === productId);

  return c.json({
    product_id: productId,
    reviews: productReviews.map((r) => ({
      id: r.id,
      author_name: r.author_name,
      rating: r.rating,
      text: r.text,
      created_at: r.created_at,
    })),
    total: productReviews.length,
    average_rating: product.rating,
  });
});

// POST /api/v2/products/:product_id/reviews -- Add a review (JWT required)
app.post("/:product_id/reviews", jwtAuth, async (c) => {
  const productId = c.req.param("product_id");
  const product = products.find((p) => p.id === productId);

  if (!product) {
    return c.json(
      {
        error: { code: "NOT_FOUND", message: "Product not found" },
      },
      404
    );
  }

  const body = await c.req.json();
  const userId = c.get("userId");

  if (!body.rating || !body.text) {
    return c.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "rating and text are required",
        },
      },
      400
    );
  }

  return c.json(
    {
      id: `rev_${Date.now().toString(36)}`,
      product_id: productId,
      user_id: userId,
      author_name: c.get("userEmail").split("@")[0],
      rating: body.rating,
      text: body.text,
      created_at: new Date().toISOString(),
    },
    201
  );
});

// GET /api/v2/products/:product_id/variants -- Product variants
app.get("/:product_id/variants", (c) => {
  const productId = c.req.param("product_id");
  const product = products.find((p) => p.id === productId);

  if (!product) {
    return c.json(
      {
        error: { code: "NOT_FOUND", message: "Product not found" },
      },
      404
    );
  }

  const productVariants = variants.filter((v) => v.product_id === productId);

  return c.json({
    product_id: productId,
    variants: productVariants,
    total: productVariants.length,
  });
});

export default app;
