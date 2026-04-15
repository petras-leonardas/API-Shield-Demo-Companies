// Journey 2: Guest Browsing (Unauthenticated)
// Simulates visitors browsing the store with varied query parameters,
// sorting, filtering, and pagination patterns.

import { PRODUCT_IDS, CATEGORY_IDS, SEARCH_TERMS } from "../config";
import {
  api, humanDelay, pick, chance, setClientProfile, randomClientProfile,
  randomSort, randomPagination, randomFilters, randomSearchParams,
} from "../http";

/**
 * Search-first browsing with varied query parameters.
 */
export async function searchBrowsingSession(): Promise<void> {
  const term = pick(SEARCH_TERMS);

  // Search with varied params (sort, category filter, price range)
  await api("GET", `/api/v2/products/search?${randomSearchParams(term)}`);
  await humanDelay();

  const productId = pick(PRODUCT_IDS);
  await api("GET", `/api/v2/products/${productId}`);
  await humanDelay();

  if (chance(0.7)) {
    await api("GET", `/api/v2/products/${productId}/reviews`);
    await humanDelay();
  }

  if (chance(0.5)) {
    await api("GET", `/api/v2/products/${productId}/variants`);
    await humanDelay();
  }

  // Sometimes refine search with different term
  if (chance(0.3)) {
    const newTerm = pick(SEARCH_TERMS);
    await api("GET", `/api/v2/products/search?${randomSearchParams(newTerm)}`);
    await humanDelay();
  }

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
 * Category-first browsing with filters and sorting.
 */
export async function categoryBrowsingSession(): Promise<void> {
  await api("GET", "/api/v2/categories");
  await humanDelay();

  const categoryId = pick(CATEGORY_IDS);
  const filters = randomFilters();
  const catUrl = filters
    ? `/api/v2/categories/${categoryId}/products?${filters}`
    : `/api/v2/categories/${categoryId}/products`;
  await api("GET", catUrl);
  await humanDelay();

  const productId = pick(PRODUCT_IDS);
  await api("GET", `/api/v2/products/${productId}`);
  await humanDelay();

  if (chance(0.6)) {
    await api("GET", `/api/v2/products/${productId}/reviews`);
    await humanDelay();
  }

  if (chance(0.4)) {
    await api("GET", `/api/v2/products/${productId}/variants`);
    await humanDelay();
  }

  // Re-sort or filter the same category
  if (chance(0.4)) {
    await api("GET", `/api/v2/categories/${categoryId}/products?${randomSort()}&${randomPagination()}`);
    await humanDelay();
  }

  if (chance(0.3)) {
    const secondCategory = pick(CATEGORY_IDS);
    await api("GET", `/api/v2/categories/${secondCategory}/products?${randomPagination()}`);
    await humanDelay();
    await api("GET", `/api/v2/products/${pick(PRODUCT_IDS)}`);
  }
}

/**
 * Catalog browsing with varied pagination and sorting.
 */
export async function catalogBrowsingSession(): Promise<void> {
  // First page with random sort/filter
  const filters = randomFilters();
  const listUrl = filters
    ? `/api/v2/products?${randomPagination()}&${filters}`
    : `/api/v2/products?${randomPagination()}`;
  await api("GET", listUrl);
  await humanDelay();

  // Page 2 with same or different sort
  if (chance(0.5)) {
    await api("GET", `/api/v2/products?${randomPagination()}&${randomSort()}`);
    await humanDelay();
  }

  // Page 3 sometimes
  if (chance(0.3)) {
    await api("GET", `/api/v2/products?page=3&limit=12&${randomSort()}`);
    await humanDelay();
  }

  const productId = pick(PRODUCT_IDS);
  await api("GET", `/api/v2/products/${productId}`);
  await humanDelay();

  if (chance(0.6)) {
    await api("GET", `/api/v2/products/${productId}/reviews`);
  }
}

/**
 * Run a random browsing session.
 */
export async function browsingJourney(): Promise<void> {
  setClientProfile(randomClientProfile());
  const roll = Math.random();

  if (roll < 0.4) {
    await searchBrowsingSession();
  } else if (roll < 0.75) {
    await categoryBrowsingSession();
  } else {
    await catalogBrowsingSession();
  }
}
