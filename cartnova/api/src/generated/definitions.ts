// CartNova Expanded API -- Domain & Resource Definitions
//
// Compact DSL for defining ~1,500 endpoints across 16 business domains.
// A generator function expands these into Hono routes with mock responses.
//
// Operations key:
//   L = GET /resource           (list)
//   G = GET /resource/:id       (get by ID)
//   C = POST /resource          (create)
//   U = PUT /resource/:id       (update)
//   P = PATCH /resource/:id     (partial update)
//   D = DELETE /resource/:id    (delete)
//   S = GET /resource/search    (search)
//
// After "|", custom endpoints:
//   :id/action POST    = POST /resource/:id/action
//   export POST        = POST /resource/export
//   :id/items LGC      = sub-resource CRUD at /resource/:id/items

export interface EndpointDef {
  method: string;
  path: string;
  auth: "jwt" | "apikey" | "session" | "none" | "internal";
  domain: string;
  resource: string;
  operation: string;
}

interface DomainSpec {
  name: string;
  versions: string[];
  basePath: string;
  auth: "jwt" | "apikey" | "session" | "none" | "internal";
  resources: Record<string, string>;
}

// ─── Domain Definitions ─────────────────────────────────────────────

const DOMAINS: DomainSpec[] = [
  // ── Legacy Commerce (v1 of the core API) ──────────────────────
  {
    name: "legacy-commerce",
    versions: ["v1"],
    basePath: "",
    auth: "jwt",
    resources: {
      products: "LGS | :id/reviews LG",
      categories: "LG | :id/products L",
      cart: "LG | items C | items/:item_id UD",
      orders: "LG | :id/tracking G",
      users: "GU",
      auth: "| login POST | register POST | refresh POST",
      checkout: "| start POST | :id/shipping U | :id/payment U | :id/confirm POST | :id/status G",
    },
  },

  // ── Admin / Backoffice ────────────────────────────────────────
  {
    name: "admin",
    versions: ["v2"],
    basePath: "admin",
    auth: "jwt",
    resources: {
      users:
        "LGCUPDS | :id/ban POST | :id/unban POST | :id/roles LGU | :id/activity LG | :id/sessions L | :id/sessions/:session_id D | export POST | bulk-update POST",
      products:
        "LGCUPDS | :id/approve POST | :id/reject POST | :id/images LGC | :id/images/:image_id D | :id/history L | bulk-update POST | bulk-delete POST | import POST | export POST",
      orders:
        "LGCUPS | :id/cancel POST | :id/refund POST | :id/notes LGC | :id/timeline L | :id/hold POST | :id/release POST | export POST | stats G",
      categories: "LGCUD | reorder POST | :id/products L | import POST",
      reviews:
        "LGS | :id/approve POST | :id/reject POST | :id/flag POST | D | bulk-approve POST | export POST",
      sellers:
        "LGCUPS | :id/approve POST | :id/suspend POST | :id/analytics G | :id/products L | :id/payouts L | :id/documents LGC | export POST",
      reports: "LGCUD | :id/run POST | :id/export POST | :id/schedule LGCUD | templates LG",
      settings: "LGU | :id/history L | bulk-update POST",
      flags: "LGCS | :id/resolve POST | :id/dismiss POST | :id/escalate POST | :id/notes LGC",
      roles: "LGCUD | :id/permissions LGU | :id/users L",
      permissions: "LG | sync POST",
      "audit-log": "LGS | export POST | :id/details G | retention GU",
    },
  },

  // ── Legacy Admin (v1) ─────────────────────────────────────────
  {
    name: "legacy-admin",
    versions: ["v1"],
    basePath: "admin",
    auth: "jwt",
    resources: {
      users: "LGCUD | :id/ban POST | :id/roles LG",
      products: "LGCUD | :id/approve POST | :id/reject POST",
      orders: "LGU | :id/cancel POST | :id/refund POST | export POST",
      categories: "LGCUD",
      reviews: "LG | :id/approve POST | :id/reject POST | D",
      settings: "LGU",
    },
  },

  // ── Inventory Management ──────────────────────────────────────
  {
    name: "inventory",
    versions: ["v2"],
    basePath: "inventory",
    auth: "jwt",
    resources: {
      "stock-levels":
        "LGS | :id/history L | :id/adjust POST | bulk-update POST | export POST | low-stock L | alerts LGC",
      warehouses:
        "LGCUDS | :id/stock LG | :id/zones LGCUD | :id/staff LGC | :id/transfers L | :id/capacity G",
      suppliers:
        "LGCUDS | :id/products L | :id/orders LG | :id/performance G | :id/contacts LGC | :id/documents LGC",
      "purchase-orders":
        "LGCUPS | :id/approve POST | :id/receive POST | :id/cancel POST | :id/items LGCUD | :id/shipments LG | :id/notes LGC",
      transfers:
        "LGCUS | :id/approve POST | :id/complete POST | :id/cancel POST | :id/items LG",
      "stock-adjustments": "LGCS | :id/approve POST | bulk-create POST",
      "inventory-reports": "LG | :id/export POST | snapshots LG | valuation G",
      "reorder-rules": "LGCUD | :id/trigger POST | suggestions L",
    },
  },

  // ── Marketing & Promotions ────────────────────────────────────
  {
    name: "marketing",
    versions: ["v2"],
    basePath: "marketing",
    auth: "jwt",
    resources: {
      campaigns:
        "LGCUPDS | :id/launch POST | :id/pause POST | :id/resume POST | :id/clone POST | :id/analytics G | :id/audiences LGC | :id/assets LGC | :id/schedule GU | archive POST",
      coupons:
        "LGCUDS | :id/validate POST | :id/usage L | :id/disable POST | bulk-create POST | bulk-disable POST | export POST | import POST",
      banners:
        "LGCUDS | :id/schedule GU | :id/analytics G | :id/publish POST | :id/unpublish POST | placements LGC",
      "ab-tests":
        "LGCUDS | :id/start POST | :id/stop POST | :id/results G | :id/variants LGCUD | :id/winner POST",
      "email-templates":
        "LGCUDS | :id/preview POST | :id/send-test POST | :id/clone POST | :id/versions LG",
      segments:
        "LGCUDS | :id/members L | :id/export POST | :id/estimate G | :id/refresh POST | prebuilt L",
      "landing-pages":
        "LGCUDS | :id/publish POST | :id/unpublish POST | :id/clone POST | :id/analytics G | :id/versions LG",
      referrals: "LGCUDS | :id/rewards L | :id/analytics G | config GU | leaderboard G",
      "push-notifications": "LGCS | :id/send POST | :id/schedule POST | :id/cancel POST | :id/analytics G | templates LGC",
    },
  },

  // ── Customer Support ──────────────────────────────────────────
  {
    name: "support",
    versions: ["v2"],
    basePath: "support",
    auth: "jwt",
    resources: {
      tickets:
        "LGCUPS | :id/close POST | :id/reopen POST | :id/assign POST | :id/merge POST | :id/split POST | :id/escalate POST | :id/messages LGC | :id/attachments LGC | :id/tags LGC | :id/watchers LGC | :id/timeline L | export POST | bulk-update POST",
      conversations:
        "LGCS | :id/reply POST | :id/close POST | :id/transfer POST | :id/participants LGC | :id/read POST",
      macros: "LGCUDS | :id/apply POST | :id/clone POST | categories LG",
      "sla-policies": "LGCUD | :id/rules LGCUD | :id/escalations LGCUD | metrics G",
      agents:
        "LGCUPS | :id/availability GU | :id/skills LGU | :id/workload G | :id/schedule GU | :id/performance G | online L",
      "canned-responses": "LGCUDS | categories LGC | :id/clone POST",
      tags: "LGCDS | merge POST",
      "satisfaction-ratings": "LGS | export POST | summary G | :id/response POST",
      "help-center": "| articles LGCUDS | articles/:id/versions LG | categories LGCUD | search S",
    },
  },

  // ── Analytics & Reporting ─────────────────────────────────────
  {
    name: "analytics",
    versions: ["v2"],
    basePath: "analytics",
    auth: "jwt",
    resources: {
      dashboards:
        "LGCUD | :id/share POST | :id/unshare POST | :id/clone POST | :id/widgets LGCUD | :id/refresh POST | :id/export POST | templates LG",
      reports:
        "LGCUD | :id/run POST | :id/schedule LGCUD | :id/export POST | :id/share POST | :id/versions LG | templates LG | scheduled L",
      metrics: "LG | realtime G | :id/history G | :id/breakdown G | custom LGCUD | compare POST",
      cohorts: "LGCUD | :id/members L | :id/analyze POST | :id/export POST | :id/retention G",
      funnels: "LGCUD | :id/analyze POST | :id/export POST | :id/steps LGCUD | :id/conversion G",
      events: "LS | :id/details G | export POST | types LGC | :id/properties G",
      segments: "LGCUD | :id/size G | :id/export POST | :id/overlap POST",
      "data-exports": "LGCS | :id/download G | :id/cancel POST | :id/retry POST | schedules LGCUD",
    },
  },

  // ── Legacy Analytics (v1) ─────────────────────────────────────
  {
    name: "legacy-analytics",
    versions: ["v1"],
    basePath: "analytics",
    auth: "jwt",
    resources: {
      reports: "LG | :id/export POST",
      metrics: "LG | realtime G",
      events: "LS | export POST",
      dashboards: "LG",
    },
  },

  // ── Payments & Finance ────────────────────────────────────────
  {
    name: "finance",
    versions: ["v2"],
    basePath: "finance",
    auth: "jwt",
    resources: {
      transactions:
        "LGS | :id/details G | :id/receipt G | :id/refund POST | export POST | summary G | :id/metadata GU | reconcile POST",
      refunds: "LGCS | :id/approve POST | :id/reject POST | :id/process POST | export POST | stats G",
      payouts:
        "LGCS | :id/approve POST | :id/cancel POST | :id/retry POST | :id/details G | schedules LGCUD | export POST | summary G",
      invoices:
        "LGCUDS | :id/send POST | :id/void POST | :id/download G | :id/payments L | :id/remind POST | :id/duplicate POST | export POST | upcoming L | overdue L",
      "tax-rates": "LGCUD | :id/history L | calculate POST | import POST | export POST | regions L",
      disputes:
        "LGCS | :id/respond POST | :id/escalate POST | :id/accept POST | :id/evidence LGC | :id/timeline L | export POST | stats G",
      "payment-methods":
        "LGCD | :id/default POST | :id/verify POST | types L",
      "billing-plans": "LGCUD | :id/archive POST | :id/subscribers L | compare G",
      subscriptions:
        "LGCUPS | :id/cancel POST | :id/pause POST | :id/resume POST | :id/upgrade POST | :id/downgrade POST | :id/invoices L | :id/usage G | metrics G",
      "revenue-reports": "LG | :id/export POST | mrr G | arr G | churn G | forecasts G",
    },
  },

  // ── Legacy Finance (v1) ───────────────────────────────────────
  {
    name: "legacy-finance",
    versions: ["v1"],
    basePath: "finance",
    auth: "jwt",
    resources: {
      transactions: "LGS | export POST | :id/refund POST",
      invoices: "LGC | :id/send POST | :id/void POST | :id/download G",
      refunds: "LGC | :id/approve POST",
      "payment-methods": "LGC | D",
      payouts: "LG | :id/details G",
    },
  },

  // ── Logistics & Shipping ──────────────────────────────────────
  {
    name: "logistics",
    versions: ["v2"],
    basePath: "logistics",
    auth: "jwt",
    resources: {
      carriers:
        "LGCUDS | :id/rates G | :id/services L | :id/zones L | :id/credentials GU | :id/test POST | :id/disable POST | :id/enable POST",
      "shipping-rates": "LG | calculate POST | :id/rules LGCUD | bulk-update POST",
      labels:
        "LGCS | :id/void POST | :id/download G | :id/track G | :id/reprint POST | bulk-create POST | manifests LGCS",
      returns:
        "LGCUPS | :id/approve POST | :id/reject POST | :id/receive POST | :id/refund POST | :id/label G | :id/items LG | :id/notes LGC | export POST | stats G",
      shipments:
        "LGCUPS | :id/track G | :id/cancel POST | :id/items LG | :id/events L | :id/label G | :id/documents LGC | bulk-create POST | export POST",
      routes: "LGCUD | :id/optimize POST | :id/stops LGCUD | :id/assign POST",
      packaging: "LGCUD | :id/dimensions GU | recommendations POST",
      "delivery-windows": "LGC | :id/availability G | :id/book POST | :id/cancel POST",
    },
  },

  // ── Legacy Logistics (v1) ─────────────────────────────────────
  {
    name: "legacy-logistics",
    versions: ["v1"],
    basePath: "logistics",
    auth: "jwt",
    resources: {
      carriers: "LG | :id/rates G",
      shipments: "LGC | :id/track G | :id/cancel POST",
      returns: "LGC | :id/approve POST | :id/reject POST",
      labels: "LG | :id/download G | :id/void POST",
    },
  },

  // ── Notifications ─────────────────────────────────────────────
  {
    name: "notifications",
    versions: ["v2"],
    basePath: "notifications",
    auth: "jwt",
    resources: {
      channels: "LGCUD | :id/test POST | :id/stats G | :id/enable POST | :id/disable POST",
      templates:
        "LGCUDS | :id/preview POST | :id/render POST | :id/clone POST | :id/versions LGC | :id/test POST | categories LGC",
      preferences: "LGU | :id/channels GU | :id/categories GU | bulk-update POST | defaults GU",
      deliveries: "LGS | :id/retry POST | :id/details G | stats G | export POST | failures L",
      schedules: "LGCUD | :id/pause POST | :id/resume POST | :id/trigger POST | upcoming L",
      "push-tokens": "LG | register POST | :id/delete D | bulk-delete POST | :id/test POST",
      "email-sends": "LGCS | :id/details G | :id/cancel POST | stats G | bounces L | complaints L",
      "in-app": "LGC | :id/read POST | :id/dismiss POST | unread-count G | mark-all-read POST",
    },
  },

  // ── Legacy Notifications (v1) ─────────────────────────────────
  {
    name: "legacy-notifications",
    versions: ["v1"],
    basePath: "notifications",
    auth: "jwt",
    resources: {
      templates: "LGC | :id/preview POST",
      preferences: "LGU",
      deliveries: "LG | stats G",
      "push-tokens": "LG | register POST | D",
    },
  },

  // ── Content Management ────────────────────────────────────────
  {
    name: "content",
    versions: ["v2"],
    basePath: "content",
    auth: "jwt",
    resources: {
      pages:
        "LGCUDS | :id/publish POST | :id/unpublish POST | :id/versions LG | :id/versions/:version_id G | :id/clone POST | :id/seo GU | :id/schedule POST",
      posts:
        "LGCUDS | :id/publish POST | :id/unpublish POST | :id/schedule POST | :id/versions LG | :id/comments LGC | :id/tags LGC | :id/related L | categories LGCUD",
      faqs:
        "LGCUDS | :id/reorder POST | :id/helpful POST | :id/not-helpful POST | categories LGCUD | import POST | export POST",
      media:
        "LGDS | upload POST | :id/metadata GU | :id/resize POST | :id/crop POST | :id/download G | :id/versions L | folders LGCUD | bulk-delete POST",
      translations:
        "LGS | :id/update PUT | :id/approve POST | :id/reject POST | export POST | import POST | languages LGC | progress G",
      menus:
        "LGCUD | :id/items LGCUD | :id/items/reorder POST | :id/clone POST | locations LG",
      redirects: "LGCUD | import POST | export POST | test POST | bulk-delete POST",
      themes: "LGCUD | :id/activate POST | :id/preview POST | :id/export POST | :id/settings GU | :id/assets LGCD",
    },
  },

  // ── Search & Recommendations ──────────────────────────────────
  {
    name: "search",
    versions: ["v2"],
    basePath: "search",
    auth: "jwt",
    resources: {
      config: "| get G | update U | reset POST | test POST",
      synonyms: "LGCUDS | import POST | export POST | bulk-delete POST",
      "boost-rules": "LGCUDS | :id/test POST | :id/preview POST | import POST",
      "stop-words": "LGCDS | import POST | export POST",
      models:
        "LGCUDS | :id/train POST | :id/deploy POST | :id/rollback POST | :id/metrics G | :id/predictions POST | :id/versions LG",
      personalization:
        "| config GU | :id/profile G | :id/profile/reset POST | :id/recommendations G | segments LGC",
      suggestions: "| query G | config GU | popular L | trending L",
      "popular-searches": "LG | clear POST | export POST | :id/boost POST | :id/hide POST",
      analytics: "| overview G | queries LG | no-results L | click-through G | export POST",
    },
  },

  // ── Partner / Affiliate API ───────────────────────────────────
  {
    name: "partners",
    versions: ["v1", "v2"],
    basePath: "partners",
    auth: "apikey",
    resources: {
      accounts:
        "LGCUPS | :id/suspend POST | :id/activate POST | :id/api-keys LGC | :id/api-keys/:key_id D | :id/settings GU | :id/limits GU",
      commissions:
        "LGS | :id/details G | config GU | :id/adjust POST | export POST | summary G | tiers LGCUD",
      "tracking-links":
        "LGCUDS | :id/clicks L | :id/conversions L | :id/analytics G | :id/clone POST | bulk-create POST",
      reports: "LGC | :id/export POST | :id/schedule LGCUD | summary G | scheduled L",
      payouts: "LGS | :id/details G | :id/approve POST | :id/reject POST | schedules GU | export POST",
      programs:
        "LGCUD | :id/partners L | :id/join POST | :id/leave POST | :id/terms GU | :id/tiers LGCUD",
      events: "LGS | :id/details G | types L",
      creatives: "LGCUDS | :id/download G | :id/analytics G | categories LG",
    },
  },

  // ── Mobile API ────────────────────────────────────────────────
  {
    name: "mobile",
    versions: ["v1", "v2"],
    basePath: "mobile",
    auth: "jwt",
    resources: {
      config: "| get G | :id/platform G",
      "feature-flags": "LG | :id/evaluate POST | bulk-evaluate POST | :id/overrides LGC",
      "deep-links": "LGCUD | :id/test POST | :id/analytics G | resolve POST",
      "push-tokens": "| register POST | :id/delete D | :id/test POST",
      "app-versions":
        "LGCUD | :id/deprecate POST | :id/force-update POST | latest G | compatibility G",
      onboarding: "| steps LG | :id/complete POST | progress GU | reset POST | config GU",
      sessions:
        "LG | :id/heartbeat POST | create POST | :id/end POST | :id/events LG | active L",
      "crash-reports": "LGS | :id/details G | :id/resolve POST | stats G | export POST",
      "app-reviews": "LGS | :id/respond POST | stats G",
    },
  },

  // ── Developer Platform ────────────────────────────────────────
  {
    name: "platform",
    versions: ["v2"],
    basePath: "platform",
    auth: "jwt",
    resources: {
      "api-keys":
        "LGCDS | :id/revoke POST | :id/rotate POST | :id/usage G | :id/permissions GU | :id/logs L",
      webhooks:
        "LGCUDS | :id/test POST | :id/logs LG | :id/retry POST | :id/disable POST | :id/enable POST | events L | :id/secret/rotate POST",
      "rate-limits": "LGU | :id/usage G | :id/history L | tiers LGC | overrides LGCUD",
      logs: "LGS | :id/details G | export POST | retention GU | streams LGCUD",
      sandbox:
        "| create POST | :id/status G | :id/reset POST | :id/delete D | :id/data POST | :id/seed POST",
      events: "LGS | :id/details G | types L | subscribe POST | unsubscribe POST | subscriptions LGD",
      usage: "| overview G | :id/history G | :id/limits GU | :id/alerts LGCUD | export POST",
      "developer-apps": "LGCUDS | :id/credentials LGC | :id/credentials/:cred_id D | :id/review POST | :id/approve POST | :id/reject POST",
    },
  },

  // ── Internal / Ops (expanded) ─────────────────────────────────
  {
    name: "internal-ops",
    versions: [""],
    basePath: "",
    auth: "internal",
    resources: {
      "internal/health": "| check GET | detailed GET | dependencies GET | readiness GET | liveness GET",
      "internal/metrics": "| get GET | prometheus GET | custom LGC | :id/history GET",
      "internal/cache":
        "| stats GET | invalidate POST | warm POST | :id/status GET | keys GET | flush POST | config GET",
      "internal/config": "| get GET | update PUT | reload POST | :id/history L | diff POST | validate POST",
      "internal/deployments":
        "LG | :id/status GET | :id/rollback POST | :id/promote POST | :id/logs L | current GET",
      "internal/jobs":
        "LGS | :id/cancel POST | :id/retry POST | :id/logs L | :id/progress GET | queues LG | queues/:queue_id/stats GET | queues/:queue_id/purge POST | queues/:queue_id/pause POST | queues/:queue_id/resume POST",
      "internal/feature-flags": "LGU | :id/toggle POST | :id/history L",
      "internal/migrations": "LG | :id/run POST | :id/rollback POST | :id/status GET | pending GET",
    },
  },
];

// ─── Endpoint Generator ─────────────────────────────────────────────

/**
 * Parse a compact resource ops string into endpoint definitions.
 *
 * Format: "LGCUPDS | :id/action METHOD | sub-path METHOD | sub-resource LGC"
 *
 * Standard ops (before first |):
 *   L=list, G=get, C=create, U=update, P=patch, D=delete, S=search
 *
 * Custom ops (after |):
 *   :id/approve POST      → POST /resource/:id/approve
 *   export POST           → POST /resource/export
 *   :id/items LGC         → GET/POST /resource/:id/items + GET /resource/:id/items/:item_id
 */
function parseOps(
  opsStr: string,
  resourcePath: string,
  domain: string,
  resource: string,
  auth: EndpointDef["auth"]
): EndpointDef[] {
  const endpoints: EndpointDef[] = [];
  const parts = opsStr.split("|").map((s) => s.trim());

  // Standard CRUD ops
  const stdOps = parts[0] || "";
  const stdMap: Record<string, { method: string; suffix: string; op: string }> = {
    L: { method: "GET", suffix: "", op: "list" },
    G: { method: "GET", suffix: "/:id", op: "get" },
    C: { method: "POST", suffix: "", op: "create" },
    U: { method: "PUT", suffix: "/:id", op: "update" },
    P: { method: "PATCH", suffix: "/:id", op: "patch" },
    D: { method: "DELETE", suffix: "/:id", op: "delete" },
    S: { method: "GET", suffix: "/search", op: "search" },
  };

  for (const ch of stdOps) {
    const mapping = stdMap[ch];
    if (mapping) {
      endpoints.push({
        method: mapping.method,
        path: `${resourcePath}${mapping.suffix}`,
        auth,
        domain,
        resource,
        operation: mapping.op,
      });
    }
  }

  // Custom ops
  for (let i = 1; i < parts.length; i++) {
    const custom = parts[i].trim();
    if (!custom) continue;

    // Check if this is a sub-resource with CRUD ops (e.g., ":id/items LGC")
    const subMatch = custom.match(/^(.+?)\s+([LGCUPDS]+)$/);
    if (subMatch) {
      const subPath = subMatch[1];
      const subOps = subMatch[2];
      const fullSubPath = `${resourcePath}/${subPath}`;
      const subName = subPath.replace(/:[\w]+\//g, "").replace(/^:id\//, "");

      for (const ch of subOps) {
        const mapping = stdMap[ch];
        if (mapping) {
          endpoints.push({
            method: mapping.method,
            path: `${fullSubPath}${mapping.suffix}`,
            auth,
            domain,
            resource: `${resource}/${subName}`,
            operation: mapping.op,
          });
        }
      }
    } else {
      // Simple custom endpoint: "path METHOD" (e.g., ":id/approve POST")
      const simpleMatch = custom.match(/^(.+?)\s+(GET|POST|PUT|PATCH|DELETE)$/);
      if (simpleMatch) {
        const actionPath = simpleMatch[1];
        const method = simpleMatch[2];
        endpoints.push({
          method,
          path: `${resourcePath}/${actionPath}`,
          auth,
          domain,
          resource,
          operation: actionPath.replace(/:[\w]+\//g, "").replace(/^:id\//, ""),
        });
      }
    }
  }

  return endpoints;
}

/**
 * Generate all endpoint definitions from the domain specs.
 */
export function generateAllEndpoints(): EndpointDef[] {
  const all: EndpointDef[] = [];

  for (const domain of DOMAINS) {
    for (const version of domain.versions) {
      for (const [resourceName, opsStr] of Object.entries(domain.resources)) {
        // Build the base path for this resource
        let basePath: string;
        if (resourceName.startsWith("internal/")) {
          // Internal routes don't have /api/vX prefix
          basePath = `/${resourceName}`;
        } else if (domain.basePath) {
          basePath = version
            ? `/api/${version}/${domain.basePath}/${resourceName}`
            : `/api/${domain.basePath}/${resourceName}`;
        } else {
          basePath = version
            ? `/api/${version}/${resourceName}`
            : `/${resourceName}`;
        }

        const endpoints = parseOps(opsStr, basePath, domain.name, resourceName, domain.auth);
        all.push(...endpoints);
      }
    }
  }

  return all;
}
