// Journey 1: Happy Path Checkout
// Full purchase flow: login -> browse -> add to cart -> checkout -> confirm
// Hits 11-14 endpoints per run depending on variations
//
// Endpoints covered:
//   POST /api/v2/auth/login
//   GET  /api/v2/products
//   GET  /api/v2/products/:id
//   GET  /api/v2/products/:id/variants
//   POST /api/v2/cart/items
//   GET  /api/v2/cart
//   PUT  /api/v2/cart/items/:item_id  (sometimes)
//   DELETE /api/v2/cart/items/:item_id (sometimes)
//   POST /api/v2/checkout/start
//   PUT  /api/v2/checkout/:id/shipping
//   PUT  /api/v2/checkout/:id/payment
//   POST /api/v2/checkout/:id/confirm
//   GET  /api/v2/checkout/:id/status

import { USERS, PRODUCT_IDS, SHIPPING_ADDRESSES, PAYMENT_METHODS } from "../config";
import { api, humanDelay, pick, pickN, chance, randInt } from "../http";

export async function checkoutJourney(): Promise<void> {
  const userIndex = Math.floor(Math.random() * USERS.length);
  const user = USERS[userIndex];
  const address = SHIPPING_ADDRESSES[userIndex];

  // 1. Login
  const loginResp = await api<{ access_token: string }>("POST", "/api/v2/auth/login", {
    body: { email: user.email, password: user.password },
  });
  if (!loginResp?.access_token) return;
  const token = loginResp.access_token;

  await humanDelay();

  // 2. Browse product catalog
  const page = randInt(1, 2);
  await api("GET", `/api/v2/products?page=${page}&limit=10`, { token });

  await humanDelay();

  // 3. View 1-3 product details (like a real shopper comparing)
  const productsToView = pickN(PRODUCT_IDS, randInt(1, 3));
  for (const productId of productsToView) {
    await api("GET", `/api/v2/products/${productId}`, { token });
    await humanDelay();

    // Sometimes check variants too
    if (chance(0.5)) {
      await api("GET", `/api/v2/products/${productId}/variants`, { token });
      await humanDelay();
    }
  }

  // 4. Add 1-2 items to cart
  const itemsToAdd = pickN(PRODUCT_IDS, randInt(1, 2));
  let lastCartItemId: string | null = null;

  for (const productId of itemsToAdd) {
    const cartResp = await api<{ items: Array<{ id: string }> }>("POST", "/api/v2/cart/items", {
      token,
      body: { product_id: productId, quantity: randInt(1, 3) },
    });

    if (cartResp?.items?.length) {
      lastCartItemId = cartResp.items[cartResp.items.length - 1].id;
    }

    await humanDelay();
  }

  // 5. View cart
  await api("GET", "/api/v2/cart", { token });
  await humanDelay();

  // Variation: sometimes update a cart item quantity
  if (chance(0.3) && lastCartItemId) {
    await api("PUT", `/api/v2/cart/items/${lastCartItemId}`, {
      token,
      body: { quantity: randInt(1, 5) },
    });
    await humanDelay();
  }

  // Variation: sometimes remove an item and add a different one
  if (chance(0.15) && lastCartItemId) {
    await api("DELETE", `/api/v2/cart/items/${lastCartItemId}`, { token });
    await humanDelay();

    const replacement = pick(PRODUCT_IDS);
    await api("POST", "/api/v2/cart/items", {
      token,
      body: { product_id: replacement, quantity: 1 },
    });
    await humanDelay();
  }

  // 6. Start checkout
  const checkoutResp = await api<{ id: string }>("POST", "/api/v2/checkout/start", { token });
  if (!checkoutResp?.id) return;
  const checkoutId = checkoutResp.id;

  await humanDelay();

  // 7. Set shipping address
  await api("PUT", `/api/v2/checkout/${checkoutId}/shipping`, {
    token,
    body: address,
  });

  await humanDelay();

  // 8. Set payment method
  const payment = pick(PAYMENT_METHODS);
  await api("PUT", `/api/v2/checkout/${checkoutId}/payment`, {
    token,
    body: payment,
  });

  await humanDelay();

  // 9. Confirm order
  await api("POST", `/api/v2/checkout/${checkoutId}/confirm`, { token });

  await humanDelay();

  // 10. Check order status
  await api("GET", `/api/v2/checkout/${checkoutId}/status`, { token });
}
