// Journey 2: Guest Browsing (Unauthenticated)
// Simulates a visitor browsing the store without logging in.
// Highest volume journey -- this is where most real traffic comes from.
//
// Endpoints covered:
//   GET /api/v2/products/search?q=...
//   GET /api/v2/categories
//   GET /api/v2/categories/:id/products
//   GET /api/v2/products/:id
//   GET /api/v2/products/:id/reviews
//   GET /api/v2/products/:id/variants

import { PRODUCT_IDS, CATEGORY_IDS, SEARCH_TERMS } from "../config";
import { api, humanDelay, pick, chance, randInt } from "../http";

/**
 * Search-first browsing: user searches, then drills into results.
 */
export async function searchBrowsingSession(): Promise<void> {
  const term = pick(SEARCH_TERMS);

  // 1. Search for products
  await api("GET", `/api/v2/products/search?q=${encodeURIComponent(term)}`);

  await humanDelay();

  // 2. Click into a product from results
  const productId = pick(PRODUCT_IDS);
  await api("GET", `/api/v2/products/${productId}`);

  await humanDelay();

  // 3. Read reviews
  if (chance(0.7)) {
    await api("GET", `/api/v2/products/${productId}/reviews`);
    await humanDelay();
  }

  // 4. Check variants / sizes
  if (chance(0.5)) {
    await api("GET", `/api/v2/products/${productId}/variants`);
    await humanDelay();
  }

  // 5. Sometimes browse another product
  if (chance(0.4)) {
    const secondProduct = pick(PRODUCT_IDS);
    await api("GET", `/api/v2/products/${secondProduct}`);
    await humanDelay();

    if (chance(0.5)) {
      await api("GET", `/api/v2/products/${secondProduct}/reviews`);
    }
  }
}

/**
 * Category-first browsing: user explores categories, then products.
 */
export async function categoryBrowsingSession(): Promise<void> {
  // 1. List all categories
  await api("GET", "/api/v2/categories");

  await humanDelay();

  // 2. Pick a category and browse its products
  const categoryId = pick(CATEGORY_IDS);
  await api("GET", `/api/v2/categories/${categoryId}/products`);

  await humanDelay();

  // 3. View a specific product from the category
  const productId = pick(PRODUCT_IDS);
  await api("GET", `/api/v2/products/${productId}`);

  await humanDelay();

  // 4. Check reviews and/or variants
  if (chance(0.6)) {
    await api("GET", `/api/v2/products/${productId}/reviews`);
    await humanDelay();
  }

  if (chance(0.4)) {
    await api("GET", `/api/v2/products/${productId}/variants`);
    await humanDelay();
  }

  // 5. Sometimes explore a second category
  if (chance(0.3)) {
    const secondCategory = pick(CATEGORY_IDS);
    await api("GET", `/api/v2/categories/${secondCategory}/products`);
    await humanDelay();

    const secondProduct = pick(PRODUCT_IDS);
    await api("GET", `/api/v2/products/${secondProduct}`);
  }
}

/**
 * Catalog browsing: user pages through the product list.
 */
export async function catalogBrowsingSession(): Promise<void> {
  // 1. First page of products
  await api("GET", "/api/v2/products?page=1&limit=10");
  await humanDelay();

  // 2. Sometimes page 2
  if (chance(0.5)) {
    await api("GET", "/api/v2/products?page=2&limit=10");
    await humanDelay();
  }

  // 3. Click into a product
  const productId = pick(PRODUCT_IDS);
  await api("GET", `/api/v2/products/${productId}`);
  await humanDelay();

  // 4. Reviews
  if (chance(0.6)) {
    await api("GET", `/api/v2/products/${productId}/reviews`);
  }
}

/**
 * Run a random browsing session (picks one of three patterns).
 */
export async function browsingJourney(): Promise<void> {
  const roll = Math.random();

  if (roll < 0.4) {
    await searchBrowsingSession();
  } else if (roll < 0.75) {
    await categoryBrowsingSession();
  } else {
    await catalogBrowsingSession();
  }
}
