// Expanded Domain Journeys
// Simulates internal teams and partner systems hitting CartNova's
// broader API surface beyond the core storefront.
//
// Each journey represents a different team/system:
//   - Admin backoffice user
//   - Inventory/warehouse manager
//   - Marketing team member
//   - Support agent
//   - Finance/billing system
//   - Logistics coordinator
//   - Content editor
//   - Analytics dashboard
//   - Partner/affiliate system
//   - Mobile app backend
//   - Platform developer
//   - Internal ops/monitoring
//   - Legacy system still running v1

import { USERS, SELLERS } from "../config";
import { api, humanDelay, pick, chance, randInt } from "../http";

// Mock IDs for generated resources
function mockId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36).slice(-6)}${Math.random().toString(36).slice(-3)}`;
}

// ── Admin Backoffice Journey ────────────────────────────────────────

export async function adminJourney(): Promise<void> {
  const user = pick(USERS);
  const login = await api<{ access_token: string }>("POST", "/api/v2/auth/login", {
    body: { email: user.email, password: user.password },
  });
  if (!login?.access_token) return;
  const token = login.access_token;

  await humanDelay();
  await api("GET", "/api/v2/admin/users?page=1&per_page=20", { token });
  await humanDelay();
  await api("GET", `/api/v2/admin/users/${mockId("usr")}`, { token });
  await humanDelay();
  await api("GET", `/api/v2/admin/users/${mockId("usr")}/activity`, { token });
  await humanDelay();
  await api("GET", "/api/v2/admin/orders?page=1&per_page=20", { token });
  await humanDelay();
  await api("GET", `/api/v2/admin/orders/${mockId("ord")}`, { token });
  await humanDelay();
  await api("GET", `/api/v2/admin/orders/${mockId("ord")}/timeline`, { token });
  await humanDelay();
  await api("GET", "/api/v2/admin/products?page=1&per_page=20", { token });
  await humanDelay();
  if (chance(0.3)) {
    await api("GET", "/api/v2/admin/reviews?page=1&per_page=20", { token });
    await humanDelay();
    await api("POST", `/api/v2/admin/reviews/${mockId("rev")}/approve`, { token, body: {} });
    await humanDelay();
  }
  await api("GET", "/api/v2/admin/audit-log?page=1&per_page=50", { token });
  await humanDelay();
  if (chance(0.3)) {
    await api("GET", "/api/v2/admin/flags?page=1&per_page=20", { token });
    await humanDelay();
    await api("GET", "/api/v2/admin/settings", { token });
  }
}

// ── Inventory Journey ───────────────────────────────────────────────

export async function inventoryJourney(): Promise<void> {
  const user = pick(USERS);
  const login = await api<{ access_token: string }>("POST", "/api/v2/auth/login", {
    body: { email: user.email, password: user.password },
  });
  if (!login?.access_token) return;
  const token = login.access_token;

  await humanDelay();
  await api("GET", "/api/v2/inventory/stock-levels?page=1&per_page=20", { token });
  await humanDelay();
  await api("GET", "/api/v2/inventory/stock-levels/low-stock", { token });
  await humanDelay();
  await api("GET", "/api/v2/inventory/warehouses", { token });
  await humanDelay();
  await api("GET", `/api/v2/inventory/warehouses/${mockId("wh")}`, { token });
  await humanDelay();
  await api("GET", `/api/v2/inventory/warehouses/${mockId("wh")}/stock`, { token });
  await humanDelay();
  await api("GET", "/api/v2/inventory/purchase-orders?page=1&per_page=20", { token });
  await humanDelay();
  await api("GET", "/api/v2/inventory/suppliers", { token });
  await humanDelay();
  if (chance(0.3)) {
    await api("GET", "/api/v2/inventory/transfers", { token });
    await humanDelay();
    await api("GET", "/api/v2/inventory/reorder-rules", { token });
  }
}

// ── Marketing Journey ───────────────────────────────────────────────

export async function marketingJourney(): Promise<void> {
  const user = pick(USERS);
  const login = await api<{ access_token: string }>("POST", "/api/v2/auth/login", {
    body: { email: user.email, password: user.password },
  });
  if (!login?.access_token) return;
  const token = login.access_token;

  await humanDelay();
  await api("GET", "/api/v2/marketing/campaigns?page=1&per_page=20", { token });
  await humanDelay();
  await api("GET", `/api/v2/marketing/campaigns/${mockId("cmp")}`, { token });
  await humanDelay();
  await api("GET", `/api/v2/marketing/campaigns/${mockId("cmp")}/analytics`, { token });
  await humanDelay();
  await api("GET", "/api/v2/marketing/coupons?page=1&per_page=20", { token });
  await humanDelay();
  await api("GET", "/api/v2/marketing/segments", { token });
  await humanDelay();
  await api("GET", "/api/v2/marketing/email-templates", { token });
  await humanDelay();
  if (chance(0.4)) {
    await api("GET", "/api/v2/marketing/ab-tests", { token });
    await humanDelay();
    await api("GET", "/api/v2/marketing/banners", { token });
    await humanDelay();
    await api("GET", "/api/v2/marketing/referrals/config", { token });
  }
  if (chance(0.3)) {
    await api("POST", "/api/v2/marketing/coupons", {
      token,
      body: { code: `SAVE${randInt(10, 50)}`, discount_percent: randInt(5, 25), max_uses: 100 },
    });
  }
}

// ── Support Journey ─────────────────────────────────────────────────

export async function supportJourney(): Promise<void> {
  const user = pick(USERS);
  const login = await api<{ access_token: string }>("POST", "/api/v2/auth/login", {
    body: { email: user.email, password: user.password },
  });
  if (!login?.access_token) return;
  const token = login.access_token;

  await humanDelay();
  await api("GET", "/api/v2/support/tickets?page=1&per_page=20", { token });
  await humanDelay();
  await api("GET", `/api/v2/support/tickets/${mockId("tkt")}`, { token });
  await humanDelay();
  await api("GET", `/api/v2/support/tickets/${mockId("tkt")}/messages`, { token });
  await humanDelay();
  await api("GET", "/api/v2/support/agents/online", { token });
  await humanDelay();
  await api("GET", "/api/v2/support/macros", { token });
  await humanDelay();
  if (chance(0.4)) {
    await api("GET", "/api/v2/support/satisfaction-ratings/summary", { token });
    await humanDelay();
    await api("GET", "/api/v2/support/sla-policies", { token });
    await humanDelay();
    await api("GET", "/api/v2/support/canned-responses", { token });
  }
}

// ── Finance Journey ─────────────────────────────────────────────────

export async function financeJourney(): Promise<void> {
  const user = pick(USERS);
  const login = await api<{ access_token: string }>("POST", "/api/v2/auth/login", {
    body: { email: user.email, password: user.password },
  });
  if (!login?.access_token) return;
  const token = login.access_token;

  await humanDelay();
  await api("GET", "/api/v2/finance/transactions?page=1&per_page=20", { token });
  await humanDelay();
  await api("GET", "/api/v2/finance/transactions/summary", { token });
  await humanDelay();
  await api("GET", "/api/v2/finance/refunds?page=1&per_page=20", { token });
  await humanDelay();
  await api("GET", "/api/v2/finance/invoices?page=1&per_page=20", { token });
  await humanDelay();
  await api("GET", "/api/v2/finance/payouts?page=1&per_page=20", { token });
  await humanDelay();
  await api("GET", "/api/v2/finance/revenue-reports/mrr", { token });
  await humanDelay();
  if (chance(0.3)) {
    await api("GET", "/api/v2/finance/disputes", { token });
    await humanDelay();
    await api("GET", "/api/v2/finance/tax-rates", { token });
    await humanDelay();
    await api("GET", "/api/v2/finance/subscriptions", { token });
  }
}

// ── Logistics Journey ───────────────────────────────────────────────

export async function logisticsJourney(): Promise<void> {
  const user = pick(USERS);
  const login = await api<{ access_token: string }>("POST", "/api/v2/auth/login", {
    body: { email: user.email, password: user.password },
  });
  if (!login?.access_token) return;
  const token = login.access_token;

  await humanDelay();
  await api("GET", "/api/v2/logistics/shipments?page=1&per_page=20", { token });
  await humanDelay();
  await api("GET", `/api/v2/logistics/shipments/${mockId("shp")}`, { token });
  await humanDelay();
  await api("GET", `/api/v2/logistics/shipments/${mockId("shp")}/track`, { token });
  await humanDelay();
  await api("GET", "/api/v2/logistics/carriers", { token });
  await humanDelay();
  await api("GET", "/api/v2/logistics/returns?page=1&per_page=20", { token });
  await humanDelay();
  await api("GET", "/api/v2/logistics/labels", { token });
  await humanDelay();
  if (chance(0.3)) {
    await api("POST", "/api/v2/logistics/shipping-rates/calculate", {
      token,
      body: { weight: 2.5, origin: "NL", destination: "DE" },
    });
  }
}

// ── Analytics Journey ───────────────────────────────────────────────

export async function analyticsJourney(): Promise<void> {
  const user = pick(USERS);
  const login = await api<{ access_token: string }>("POST", "/api/v2/auth/login", {
    body: { email: user.email, password: user.password },
  });
  if (!login?.access_token) return;
  const token = login.access_token;

  await humanDelay();
  await api("GET", "/api/v2/analytics/dashboards", { token });
  await humanDelay();
  await api("GET", `/api/v2/analytics/dashboards/${mockId("dsh")}`, { token });
  await humanDelay();
  await api("GET", "/api/v2/analytics/metrics/realtime", { token });
  await humanDelay();
  await api("GET", "/api/v2/analytics/reports", { token });
  await humanDelay();
  await api("GET", "/api/v2/analytics/funnels", { token });
  await humanDelay();
  if (chance(0.4)) {
    await api("GET", "/api/v2/analytics/cohorts", { token });
    await humanDelay();
    await api("GET", "/api/v2/analytics/events", { token });
  }
}

// ── Content Journey ─────────────────────────────────────────────────

export async function contentJourney(): Promise<void> {
  const user = pick(USERS);
  const login = await api<{ access_token: string }>("POST", "/api/v2/auth/login", {
    body: { email: user.email, password: user.password },
  });
  if (!login?.access_token) return;
  const token = login.access_token;

  await humanDelay();
  await api("GET", "/api/v2/content/pages", { token });
  await humanDelay();
  await api("GET", `/api/v2/content/pages/${mockId("pg")}`, { token });
  await humanDelay();
  await api("GET", "/api/v2/content/posts", { token });
  await humanDelay();
  await api("GET", "/api/v2/content/media", { token });
  await humanDelay();
  await api("GET", "/api/v2/content/menus", { token });
  await humanDelay();
  if (chance(0.3)) {
    await api("GET", "/api/v2/content/faqs", { token });
    await humanDelay();
    await api("GET", "/api/v2/content/translations", { token });
    await humanDelay();
    await api("GET", "/api/v2/content/redirects", { token });
  }
}

// ── Partner Journey (API key auth) ──────────────────────────────────

export async function partnerJourney(): Promise<void> {
  const seller = pick(SELLERS);
  const apiKey = seller.apiKey;

  await api("GET", "/api/v2/partners/accounts", { apiKey });
  await humanDelay();
  await api("GET", `/api/v2/partners/accounts/${mockId("prt")}`, { apiKey });
  await humanDelay();
  await api("GET", "/api/v2/partners/commissions", { apiKey });
  await humanDelay();
  await api("GET", "/api/v2/partners/commissions/summary", { apiKey });
  await humanDelay();
  await api("GET", "/api/v2/partners/tracking-links", { apiKey });
  await humanDelay();
  await api("GET", "/api/v2/partners/reports", { apiKey });
  await humanDelay();
  await api("GET", "/api/v2/partners/programs", { apiKey });
  await humanDelay();
  if (chance(0.3)) {
    await api("GET", "/api/v2/partners/payouts", { apiKey });
    await humanDelay();
    await api("GET", "/api/v2/partners/events", { apiKey });
    await humanDelay();
    await api("GET", "/api/v2/partners/creatives", { apiKey });
  }
}

// ── Mobile App Journey ──────────────────────────────────────────────

export async function mobileJourney(): Promise<void> {
  const user = pick(USERS);
  const login = await api<{ access_token: string }>("POST", "/api/v2/auth/login", {
    body: { email: user.email, password: user.password },
  });
  if (!login?.access_token) return;
  const token = login.access_token;

  await humanDelay();
  await api("GET", "/api/v2/mobile/config/get", { token });
  await humanDelay();
  await api("GET", "/api/v2/mobile/feature-flags", { token });
  await humanDelay();
  await api("GET", "/api/v2/mobile/app-versions/latest", { token });
  await humanDelay();
  await api("POST", "/api/v2/mobile/sessions/create", { token, body: { device: "ios", version: "3.2.1" } });
  await humanDelay();
  await api("GET", "/api/v2/mobile/onboarding/steps", { token });
  await humanDelay();
  if (chance(0.3)) {
    await api("GET", "/api/v2/mobile/deep-links", { token });
    await humanDelay();
    await api("GET", "/api/v2/mobile/crash-reports/stats", { token });
  }
}

// ── Legacy V1 Journey ───────────────────────────────────────────────

export async function legacyJourney(): Promise<void> {
  const user = pick(USERS);
  const login = await api<{ access_token: string }>("POST", "/api/v2/auth/login", {
    body: { email: user.email, password: user.password },
  });
  if (!login?.access_token) return;
  const token = login.access_token;

  // Legacy v1 commerce endpoints
  await humanDelay();
  await api("GET", "/api/v1/products", { token });
  await humanDelay();
  await api("GET", `/api/v1/products/${pick(["prod_tv4k01", "prod_ear001", "prod_jkt001"])}`, { token });
  await humanDelay();
  await api("GET", "/api/v1/categories", { token });
  await humanDelay();
  await api("GET", "/api/v1/orders", { token });
  await humanDelay();

  // Legacy v1 admin
  if (chance(0.4)) {
    await api("GET", "/api/v1/admin/users", { token });
    await humanDelay();
    await api("GET", "/api/v1/admin/products", { token });
    await humanDelay();
    await api("GET", "/api/v1/admin/orders", { token });
  }

  // Legacy v1 finance
  if (chance(0.3)) {
    await api("GET", "/api/v1/finance/transactions", { token });
    await humanDelay();
    await api("GET", "/api/v1/finance/invoices", { token });
  }

  // Legacy v1 analytics
  if (chance(0.3)) {
    await api("GET", "/api/v1/analytics/reports", { token });
    await humanDelay();
    await api("GET", "/api/v1/analytics/metrics/realtime", { token });
  }
}

// ── Internal Ops Journey ────────────────────────────────────────────

export async function internalOpsJourney(): Promise<void> {
  await api("GET", "/internal/health/check");
  await humanDelay();
  await api("GET", "/internal/health/dependencies");
  await humanDelay();
  await api("GET", "/internal/metrics/get");
  await humanDelay();
  await api("GET", "/internal/cache/stats");
  await humanDelay();
  await api("GET", "/internal/config/get");
  await humanDelay();
  if (chance(0.3)) {
    await api("GET", "/internal/deployments/current");
    await humanDelay();
    await api("GET", "/internal/jobs");
    await humanDelay();
    await api("GET", "/internal/feature-flags");
  }
}
