// Journey 4: Authenticated User Activity
// Simulates a returning user checking their account: profile, addresses,
// order history, tracking, leaving reviews, requesting returns, refreshing tokens.
//
// Endpoints covered:
//   POST /api/v2/auth/login
//   POST /api/v2/auth/refresh
//   POST /api/v2/auth/register    (rare -- new user signup)
//   GET  /api/v2/users/me
//   PUT  /api/v2/users/me
//   GET  /api/v2/users/me/addresses
//   GET  /api/v2/orders
//   GET  /api/v2/orders/:id
//   GET  /api/v2/orders/:id/tracking
//   POST /api/v2/orders/:id/return (rare)
//   POST /api/v2/products/:id/reviews

import { USERS, USER_ORDERS, PRODUCT_IDS } from "../config";
import { api, humanDelay, pick, chance, randInt, setClientProfile, randomClientProfile, getOrLogin } from "../http";

export async function userActivityJourney(): Promise<void> {
  setClientProfile(randomClientProfile());

  // Variation: sometimes simulate a brand new user registering
  if (chance(0.1)) {
    await newUserRegistration();
    return;
  }

  const userIndex = Math.floor(Math.random() * USERS.length);
  const user = USERS[userIndex];

  // 1. Login (uses token cache)
  const token = await getOrLogin(user.email, user.password);
  if (!token) return;

  await humanDelay();

  // 2. View profile
  await api("GET", "/api/v2/users/me", { token });

  await humanDelay();

  // 3. Sometimes update profile
  if (chance(0.2)) {
    await api("PUT", "/api/v2/users/me", {
      token,
      body: { phone: `+31-20-555-${String(randInt(1000, 9999))}` },
    });
    await humanDelay();
  }

  // 4. Check saved addresses
  await api("GET", "/api/v2/users/me/addresses", { token });

  await humanDelay();

  // 5. View order history
  await api("GET", "/api/v2/orders", { token });

  await humanDelay();

  // 6. View a specific order detail + tracking
  const userOrders = USER_ORDERS[user.userId] || [];
  if (userOrders.length > 0) {
    const orderId = pick(userOrders);

    await api("GET", `/api/v2/orders/${orderId}`, { token });
    await humanDelay();

    await api("GET", `/api/v2/orders/${orderId}/tracking`, { token });
    await humanDelay();

    // Rare: request a return (only works on delivered orders)
    if (chance(0.1)) {
      await api("POST", `/api/v2/orders/${orderId}/return`, {
        token,
        body: {
          reason: pick([
            "Item does not match description",
            "Wrong size",
            "Defective product",
            "Changed my mind",
          ]),
        },
      });
      await humanDelay();
    }
  }

  // 7. Sometimes leave a review on a product they browsed
  if (chance(0.2)) {
    const productId = pick(PRODUCT_IDS);
    await api("POST", `/api/v2/products/${productId}/reviews`, {
      token,
      body: {
        rating: randInt(3, 5),
        title: pick([
          "Great product!",
          "Exactly what I needed",
          "Good quality",
          "Fast shipping",
          "Decent value",
          "Very satisfied",
        ]),
        comment: pick([
          "Works exactly as described. Would recommend.",
          "Arrived quickly, no issues with the product.",
          "Good quality for the price. Happy with my purchase.",
          "Been using it daily, holds up well.",
          "Exceeded my expectations. Will buy again.",
        ]),
      },
    });
    await humanDelay();
  }

  // 8. Sometimes simulate a token refresh
  if (chance(0.15)) {
    await api("POST", "/api/v2/auth/refresh", {
      cookie: `refresh_token=mock_refresh_${user.userId}`,
    });
  }
}

/**
 * Simulates a new user signing up. Rare event (~10% of user activity journeys).
 */
async function newUserRegistration(): Promise<void> {
  const timestamp = Date.now().toString(36);
  const email = `user_${timestamp}@example.com`;

  const registerResp = await api<{ access_token: string }>("POST", "/api/v2/auth/register", {
    body: {
      email,
      password: "NewUser!2024",
      name: `Test User ${timestamp}`,
    },
  });

  if (!registerResp?.access_token) return;
  const token = registerResp.access_token;

  await humanDelay();

  // New user typically views their profile immediately
  await api("GET", "/api/v2/users/me", { token });

  await humanDelay();

  // Then starts browsing
  await api("GET", "/api/v2/products?page=1&limit=10", { token });
}
