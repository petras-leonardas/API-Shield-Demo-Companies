// Error Traffic Journey
// Simulates the kind of bad/broken requests every production API receives.
// These populate the error breakdown in Security Analytics and exercise
// API Shield's ability to distinguish legitimate errors from attacks.
//
// Error types:
//   - Expired JWT tokens (401)
//   - Invalid/malformed auth headers (401)
//   - Missing required fields (400)
//   - Non-existent endpoints (404)
//   - Wrong HTTP methods (405)
//   - Invalid JSON bodies (400)
//   - Missing auth on protected endpoints (401)

import { USERS, PRODUCT_IDS, CATEGORY_IDS } from "../config";
import { api, burstDelay, pick, setClientProfile } from "../http";

// A fake expired JWT (valid structure, expired timestamp)
const EXPIRED_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyX2E4azJtMW56IiwiZW1haWwiOiJlbW1hLmpvaG5zb25AZXhhbXBsZS5jb20iLCJyb2xlIjoiYnV5ZXIiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwMDkwMCwiaXNzIjoiY2FydG5vdmEtYXV0aCJ9.invalid_signature_here";

// A completely malformed token
const GARBAGE_JWT = "not-a-jwt-token";

// Wrong-key signed JWT
const WRONG_KEY_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyX2hhY2tlciIsImVtYWlsIjoiaGFja2VyQGV2aWwuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzc2MjAwMDAwLCJleHAiOjE3Nzk4MDAwMDAsImlzcyI6Im5vdC1jYXJ0bm92YSJ9.fakesignature";

export async function errorTrafficJourney(): Promise<void> {
  setClientProfile("browser");

  // ── Expired JWT (401) ───────────────────────────────────────────
  await api("GET", "/api/v2/cart", { token: EXPIRED_JWT });
  await burstDelay();
  await api("GET", "/api/v2/orders", { token: EXPIRED_JWT });
  await burstDelay();
  await api("GET", "/api/v2/users/me", { token: EXPIRED_JWT });
  await burstDelay();

  // ── Malformed auth header (401) ─────────────────────────────────
  await api("GET", "/api/v2/cart", {
    rawHeaders: { Authorization: "Bearer" }, // missing token
  });
  await burstDelay();
  await api("GET", "/api/v2/orders", {
    rawHeaders: { Authorization: GARBAGE_JWT }, // no "Bearer " prefix
  });
  await burstDelay();
  await api("GET", "/api/v2/users/me", { token: WRONG_KEY_JWT });
  await burstDelay();

  // ── Missing auth on protected endpoints (401) ──────────────────
  await api("GET", "/api/v2/cart"); // no auth at all
  await burstDelay();
  await api("POST", "/api/v2/checkout/start", { body: {} });
  await burstDelay();
  await api("GET", "/api/v2/admin/users"); // admin without JWT
  await burstDelay();

  // ── Missing required fields (400) ──────────────────────────────
  // Login without password
  await api("POST", "/api/v2/auth/login", { body: { email: "test@test.com" } });
  await burstDelay();
  // Register without name
  await api("POST", "/api/v2/auth/register", {
    body: { email: "incomplete@test.com", password: "test" },
  });
  await burstDelay();
  // Add to cart without product_id
  const user = pick(USERS);
  const login = await api<{ access_token: string }>("POST", "/api/v2/auth/login", {
    body: { email: user.email, password: "test" },
  });
  if (login?.access_token) {
    await api("POST", "/api/v2/cart/items", {
      token: login.access_token,
      body: { quantity: 1 }, // missing product_id
    });
    await burstDelay();
    // Checkout shipping without required fields
    await api("PUT", "/api/v2/checkout/chk_fake123/shipping", {
      token: login.access_token,
      body: { name: "Test" }, // missing address, city, etc.
    });
    await burstDelay();
  }

  // ── Invalid JSON body (400) ────────────────────────────────────
  await api("POST", "/api/v2/auth/login", {
    body: "this is not json" as any,
    rawHeaders: { "Content-Type": "application/json" },
  });
  await burstDelay();

  // ── Non-existent endpoints (404) ───────────────────────────────
  await api("GET", "/api/v2/nonexistent");
  await burstDelay();
  await api("GET", "/api/v2/products/prod_does_not_exist");
  await burstDelay();
  await api("GET", "/api/v3/products"); // wrong API version
  await burstDelay();
  await api("GET", "/api/v2/user/profile"); // wrong path (users/me vs user/profile)
  await burstDelay();
  await api("GET", "/api/v2/order/history"); // wrong path
  await burstDelay();
  await api("GET", "/api/products"); // missing version
  await burstDelay();

  // ── Wrong HTTP methods (405 or fallback) ───────────────────────
  await api("DELETE", "/api/v2/products"); // can't delete the collection
  await burstDelay();
  await api("PUT", "/api/v2/auth/login", { body: { email: "a", password: "b" } });
  await burstDelay();
  await api("PATCH", `/api/v2/products/${pick(PRODUCT_IDS)}`, { body: { price: 0 } });
  await burstDelay();
  await api("POST", `/api/v2/categories/${pick(CATEGORY_IDS)}/products`, { body: {} });
  await burstDelay();
}
