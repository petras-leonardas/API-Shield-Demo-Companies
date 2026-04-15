// CartNova Category Routes -- part of the 8 product endpoints
// Public, no auth required.

import { Hono } from "hono";
import { categories, products } from "../data/seed";

const app = new Hono();

// GET /api/v2/categories -- List all categories
app.get("/", (c) => {
  return c.json({
    categories: categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
    })),
    total: categories.length,
  });
});

// GET /api/v2/categories/:category_id/products -- Products in a category
app.get("/:category_id/products", (c) => {
  const categoryId = c.req.param("category_id");
  const category = categories.find((cat) => cat.id === categoryId);

  if (!category) {
    return c.json(
      {
        error: { code: "NOT_FOUND", message: "Category not found" },
      },
      404
    );
  }

  const categoryProducts = products.filter(
    (p) => p.category_id === categoryId
  );

  return c.json({
    category: {
      id: category.id,
      name: category.name,
    },
    products: categoryProducts.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency,
      rating: p.rating,
      in_stock: p.in_stock,
      image: p.images[0] || null,
    })),
    total: categoryProducts.length,
  });
});

export default app;
