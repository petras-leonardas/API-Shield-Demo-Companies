// Journey 3: Seller Activity (API Key Auth)
// Simulates a seller managing their storefront: checking listings,
// creating/updating products, reviewing analytics and orders.
//
// Endpoints covered:
//   GET  /api/v2/sellers/me/products
//   POST /api/v2/sellers/me/products
//   PUT  /api/v2/sellers/me/products/:id
//   GET  /api/v2/sellers/me/analytics
//   GET  /api/v2/sellers/me/orders

import { SELLERS, NEW_PRODUCT_TEMPLATES } from "../config";
import { api, humanDelay, pick, chance } from "../http";

export async function sellerJourney(): Promise<void> {
  const seller = pick(SELLERS);
  const apiKey = seller.apiKey;

  // 1. Check current product listings
  await api("GET", "/api/v2/sellers/me/products", { apiKey });

  await humanDelay();

  // 2. Sometimes create a new product listing
  if (chance(0.4)) {
    const template = pick(NEW_PRODUCT_TEMPLATES);
    await api("POST", "/api/v2/sellers/me/products", {
      apiKey,
      body: {
        name: template.name,
        price: template.price,
        category_id: template.category_id,
        description: `High quality ${template.name.toLowerCase()}. Ships within 2-3 business days.`,
        currency: "EUR",
      },
    });
    await humanDelay();
  }

  // 3. Update an existing product (price or stock)
  if (chance(0.5) && seller.productIds.length > 0) {
    const productId = pick(seller.productIds);
    const updates: Record<string, unknown> = {};

    if (chance(0.5)) {
      // Price adjustment (+/- 10%)
      updates.price = Math.round((15 + Math.random() * 200) * 100) / 100;
    }
    if (chance(0.3)) {
      updates.in_stock = chance(0.9); // 90% chance still in stock
    }

    await api("PUT", `/api/v2/sellers/me/products/${productId}`, {
      apiKey,
      body: updates,
    });
    await humanDelay();
  }

  // 4. Check analytics dashboard
  await api("GET", "/api/v2/sellers/me/analytics", { apiKey });

  await humanDelay();

  // 5. Review recent orders
  await api("GET", "/api/v2/sellers/me/orders", { apiKey });
}
