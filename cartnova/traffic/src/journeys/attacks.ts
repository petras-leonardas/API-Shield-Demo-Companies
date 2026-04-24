// CartNova Attack Traffic Patterns (5a-5f)
//
// These journeys generate traffic that API Shield features should detect
// and/or block. Each maps to a specific feature test in feature-test-map.md.
//
// 5a: Rate limit abuse        → Volumetric Abuse Detection
// 5b: Sequence skip-to-confirm → Sequence Mitigation
// 5c: Cross-user checkout     → BOLA Detection + JWT scope
// 5d: JWT attacks             → JWT Validation
// 5e: BOLA enumeration        → BOLA Vulnerability Detection
// 5f: Shadow API probing      → API Discovery + Authentication Posture
//
// These run via the CI runner (GitHub Actions), NOT from the Worker,
// so traffic passes through Cloudflare's full security pipeline.

import { createHmac } from "node:crypto";
import { USERS, PRODUCT_IDS, SEARCH_TERMS, CHECKOUT_IDS, USER_ORDERS } from "../config";
import {
  api, burstDelay, humanDelay, pick, randInt,
  setClientProfile, getOrLogin,
} from "../http";

// ── JWT Helpers ─────────────────────────────────────────────────────
// The API server uses HS256 with this known secret (intentional for testing).

const JWT_SECRET = "cartnova-jwt-secret-2024";
const JWT_ISSUER = "cartnova-auth";

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

function signJwt(payload: Record<string, unknown>, secret = JWT_SECRET): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const signature = base64url(
    createHmac("sha256", secret).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${signature}`;
}

function makeToken(overrides: Record<string, unknown> = {}): string {
  const now = Math.floor(Date.now() / 1000);
  return signJwt({
    sub: "user_a8k2m1nz",
    email: "emma.johnson@example.com",
    role: "buyer",
    iat: now,
    exp: now + 900,
    iss: JWT_ISSUER,
    ...overrides,
  });
}

// ─────────────────────────────────────────────────────────────────────
// 5a: Rate Limit Abuse
// 100 rapid requests to /products/search in ~10 seconds.
// Tests: Volumetric Abuse Detection, rate limiting rules.
// ─────────────────────────────────────────────────────────────────────

export async function attackRateLimitAbuse(): Promise<void> {
  setClientProfile("integration");
  // Reduced from 100 → 30 requests to fit the daily request budget.
  // Still bursty enough to trigger rate-limit rules (which typically
  // threshold at 10-20 req/s).
  console.log("    [5a] Rate limit abuse: 30 rapid search requests");

  const term = pick(SEARCH_TERMS);
  for (let i = 0; i < 30; i++) {
    // Fire without awaiting response sequentially but with minimal delay
    await api("GET", `/api/v2/products/search?q=${encodeURIComponent(term)}`);
    await burstDelay(); // 5-25ms between requests
  }
}

// ─────────────────────────────────────────────────────────────────────
// 5b: Sequence Violation — Skip to Confirm
// Login, then jump straight to checkout confirm without cart/shipping/payment.
// Tests: Sequence Mitigation (should block out-of-order requests).
// ─────────────────────────────────────────────────────────────────────

export async function attackSequenceSkipToConfirm(): Promise<void> {
  setClientProfile("desktop");
  console.log("    [5b] Sequence violation: skip to confirm");

  const user = pick(USERS);
  const token = await getOrLogin(user.email, user.password);
  if (!token) return;

  await humanDelay();

  // Attempt 1: Try to confirm a checkout that was never started
  const fakeCheckoutId = `chk_attack${Date.now().toString(36).slice(-4)}`;
  await api("POST", `/api/v2/checkout/${fakeCheckoutId}/confirm`, { token });

  await burstDelay();

  // Attempt 2: Start checkout, then skip shipping/payment, go straight to confirm
  await api("POST", "/api/v2/cart/items", {
    token,
    body: { product_id: pick(PRODUCT_IDS), quantity: 1 },
  });
  await burstDelay();

  const checkoutResp = await api<{ id: string }>("POST", "/api/v2/checkout/start", { token });
  if (!checkoutResp?.id) return;

  await burstDelay();

  // Skip shipping and payment — go straight to confirm
  await api("POST", `/api/v2/checkout/${checkoutResp.id}/confirm`, { token });

  await burstDelay();

  // Attempt 3: Set payment without shipping first (wrong order)
  await api("PUT", `/api/v2/checkout/${checkoutResp.id}/payment`, {
    token,
    body: { payment_method: "card", card_token: "tok_stolen_9999" },
  });
}

// ─────────────────────────────────────────────────────────────────────
// 5c: Cross-User Checkout Access (BOLA)
// Login as User A, try to access User B's checkout status.
// Tests: BOLA Detection + JWT scope validation.
// ─────────────────────────────────────────────────────────────────────

export async function attackCrossUserCheckout(): Promise<void> {
  setClientProfile("desktop");
  console.log("    [5c] Cross-user checkout access (BOLA)");

  // Login as User A (Emma)
  const userA = USERS[0];
  const tokenA = await getOrLogin(userA.email, userA.password);
  if (!tokenA) return;

  await humanDelay();

  // Try to access known checkout IDs (which belong to different users)
  for (const checkoutId of CHECKOUT_IDS) {
    await api("GET", `/api/v2/checkout/${checkoutId}/status`, { token: tokenA });
    await burstDelay();
  }

  // Login as User B (Lucas), try to access User A's orders
  const userB = USERS[1];
  const tokenB = await getOrLogin(userB.email, userB.password);
  if (!tokenB) return;

  await humanDelay();

  // User B tries to read User A's orders (BOLA — should succeed due to vuln)
  const userAOrders = USER_ORDERS[userA.userId] || [];
  for (const orderId of userAOrders) {
    await api("GET", `/api/v2/orders/${orderId}`, { token: tokenB });
    await burstDelay();
    await api("GET", `/api/v2/orders/${orderId}/tracking`, { token: tokenB });
    await burstDelay();
  }
}

// ─────────────────────────────────────────────────────────────────────
// 5d: JWT Attacks
// Send requests with expired, tampered, wrong-issuer, and wrong-key tokens.
// Tests: JWT Validation rules at the Cloudflare edge.
// ─────────────────────────────────────────────────────────────────────

export async function attackJwtAttacks(): Promise<void> {
  setClientProfile("integration");
  console.log("    [5d] JWT attacks: expired, tampered, wrong-issuer, wrong-key");

  // Reduced endpoint list from 4 → 2 per attack variant to fit budget.
  // Each attack type (expired, wrong-issuer, wrong-key, tampered) still
  // hits multiple endpoints, just fewer per run.
  const endpoints = [
    "/api/v2/cart",
    "/api/v2/users/me",
  ];

  // Attack 1: Expired token (expired 1 hour ago)
  const now = Math.floor(Date.now() / 1000);
  const expiredToken = makeToken({
    iat: now - 7200,
    exp: now - 3600,
  });
  for (const ep of endpoints) {
    const method = ep.includes("start") ? "POST" : "GET";
    await api(method, ep, { token: expiredToken });
    await burstDelay();
  }

  // Attack 2: Wrong issuer
  const wrongIssuerToken = makeToken({
    iss: "evil-service",
  });
  for (const ep of endpoints) {
    const method = ep.includes("start") ? "POST" : "GET";
    await api(method, ep, { token: wrongIssuerToken });
    await burstDelay();
  }

  // Attack 3: Token signed with wrong key
  const wrongKeyToken = signJwt(
    {
      sub: "user_a8k2m1nz",
      email: "emma.johnson@example.com",
      role: "buyer",
      iat: now,
      exp: now + 900,
      iss: JWT_ISSUER,
    },
    "completely-wrong-secret-key"
  );
  for (const ep of endpoints) {
    const method = ep.includes("start") ? "POST" : "GET";
    await api(method, ep, { token: wrongKeyToken });
    await burstDelay();
  }

  // Attack 4: Tampered payload (change role to admin, keep original signature)
  const validToken = makeToken({ role: "buyer" });
  const parts = validToken.split(".");
  const tamperedPayload = base64url(
    JSON.stringify({
      sub: "user_a8k2m1nz",
      email: "emma.johnson@example.com",
      role: "admin", // escalated
      iat: now,
      exp: now + 900,
      iss: JWT_ISSUER,
    })
  );
  const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
  for (const ep of endpoints) {
    const method = ep.includes("start") ? "POST" : "GET";
    await api(method, ep, { token: tamperedToken });
    await burstDelay();
  }

  // Attack 5: Completely malformed "tokens"
  const garbageTokens = [
    "not-a-jwt-at-all",
    "eyJhbGciOiJIUzI1NiJ9.garbage.garbage",
    "",
    "Bearer",
  ];
  for (const garbage of garbageTokens) {
    await api("GET", "/api/v2/cart", { token: garbage });
    await burstDelay();
  }
}

// ─────────────────────────────────────────────────────────────────────
// 5e: BOLA Enumeration
// Iterate through sequential order IDs to find other users' orders.
// Tests: BOLA Vulnerability Detection, rate limiting.
// ─────────────────────────────────────────────────────────────────────

export async function attackBolaEnumeration(): Promise<void> {
  setClientProfile("integration");
  // Reduced enumeration ranges to fit the daily request budget.
  // Previous: 60 order attempts + 15 tracking + 15 checkout = 90 requests.
  // New: 18 order attempts + 6 tracking + 5 checkout = 29 requests.
  // Still clearly enumeration-shaped traffic that API Shield should flag.
  console.log("    [5e] BOLA enumeration: sequential order ID iteration");

  // Login as User C (Sofia) — only has 1 order
  const user = USERS[2];
  const token = await getOrLogin(user.email, user.password);
  if (!token) return;

  await humanDelay();

  // Enumerate order IDs trying to find other users' orders
  const prefixes = ["ord_em", "ord_lc", "ord_sm"];
  for (const prefix of prefixes) {
    for (let i = 1; i <= 6; i++) {
      const orderId = `${prefix}${String(i).padStart(4, "0")}`;
      await api("GET", `/api/v2/orders/${orderId}`, { token });
      await burstDelay();

      // Also try tracking endpoint
      if (i <= 2) {
        await api("GET", `/api/v2/orders/${orderId}/tracking`, { token });
        await burstDelay();
      }
    }
  }

  // Also enumerate checkout IDs
  for (let i = 1; i <= 5; i++) {
    const checkoutId = `chk_${String(i).padStart(4, "0")}`;
    await api("GET", `/api/v2/checkout/${checkoutId}/status`, { token });
    await burstDelay();
  }
}

// ─────────────────────────────────────────────────────────────────────
// 5f: Shadow API Probing
// Access internal endpoints that shouldn't be publicly reachable.
// Tests: API Discovery (unmanaged endpoints), Authentication Posture.
// ─────────────────────────────────────────────────────────────────────

export async function attackShadowApiProbing(): Promise<void> {
  setClientProfile("developer");
  console.log("    [5f] Shadow API probing: internal endpoints");

  // Probe the known internal endpoints (no auth)
  await api("GET", "/internal/health");
  await burstDelay();
  await api("GET", "/internal/metrics");
  await burstDelay();

  // The dangerous one: cache invalidation (POST, no auth)
  await api("POST", "/internal/cache/invalidate", {
    body: { scope: "products", keys: ["prod_tv4k01", "prod_hp2401"] },
  });
  await burstDelay();

  // Try broader cache invalidation
  await api("POST", "/internal/cache/invalidate", {
    body: { scope: "all" },
  });
  await burstDelay();

  // Probe for common internal/debug paths that might exist.
  // Reduced from 15 → ~5 probe paths per run. A rotating subset keeps
  // the probing pattern visible over time without burning budget.
  const allProbePaths = [
    "/internal/debug",
    "/internal/config",
    "/internal/env",
    "/internal/db-status",
    "/internal/logs",
    "/debug/vars",
    "/debug/pprof",
    "/actuator/health",
    "/actuator/env",
    "/.well-known/openapi.json",
    "/api/v2/internal/admin",
    "/admin",
    "/status",
    "/healthz",
    "/readyz",
  ];
  // Pick 5 random probes per run (shuffle + slice)
  const probePaths = [...allProbePaths].sort(() => Math.random() - 0.5).slice(0, 5);

  for (const path of probePaths) {
    await api("GET", path);
    await burstDelay();
  }
}

// ─────────────────────────────────────────────────────────────────────
// Combined runner: executes all 6 attack patterns in sequence
// ─────────────────────────────────────────────────────────────────────

export async function allAttacks(): Promise<void> {
  console.log("  Running all attack patterns (5a-5f)...");

  await attackRateLimitAbuse();
  await attackSequenceSkipToConfirm();
  await attackCrossUserCheckout();
  await attackJwtAttacks();
  await attackBolaEnumeration();
  await attackShadowApiProbing();

  console.log("  All attack patterns complete.");
}
