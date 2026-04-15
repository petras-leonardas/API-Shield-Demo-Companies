// CartNova Generated Routes Handler
//
// Creates a Hono app with ~1,500 generated routes that return realistic
// mock responses. These sit alongside the 37 hand-crafted core routes.
//
// Each route:
// - Enforces the correct auth type (JWT, API key, or none)
// - Returns a plausible JSON response based on the operation type
// - Uses the resource name to generate contextually appropriate field names

import { Hono } from "hono";
import { generateAllEndpoints, type EndpointDef } from "./definitions";
import { jwtAuth } from "../middleware/jwt";
import { apiKeyAuth } from "../middleware/apikey";

// ─── Mock Data Generator ────────────────────────────────────────────

/** Deterministic hash for consistent mock data from a string seed. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Generate a mock ID for a resource (e.g., "warehouses" -> "wh_a8k2m1"). */
function mockId(resource: string, index: number): string {
  const prefix = resource
    .replace(/s$/, "")
    .replace(/-/g, "")
    .slice(0, 3);
  const suffix = hash(`${resource}${index}`).toString(36).slice(0, 6);
  return `${prefix}_${suffix}`;
}

/** Generate a mock name for a resource item. */
function mockName(resource: string, index: number): string {
  const names: Record<string, string[]> = {
    users: ["Alice Meyer", "Bob Wilson", "Carlos Ruiz", "Diana Park", "Erik Larsen"],
    products: ["Premium Widget", "Standard Gadget", "Pro Tool", "Basic Supply", "Elite Module"],
    orders: ["Order #1001", "Order #1002", "Order #1003", "Order #1004", "Order #1005"],
    warehouses: ["Amsterdam Central", "Berlin Hub", "Barcelona Depot", "Oslo Storage", "Dublin Center"],
    campaigns: ["Summer Sale 2024", "Black Friday", "New Year Promo", "Easter Special", "Flash Deal"],
    tickets: ["Login issue", "Payment failed", "Missing item", "Refund request", "Delivery delay"],
    carriers: ["PostNL", "DHL Express", "FedEx", "UPS", "SEUR"],
    reports: ["Monthly Revenue", "Weekly Traffic", "Quarterly KPIs", "Annual Summary", "Daily Active"],
    templates: ["Welcome Email", "Order Confirmation", "Shipping Update", "Password Reset", "Newsletter"],
    pages: ["About Us", "Terms of Service", "Privacy Policy", "Contact", "FAQ"],
    roles: ["admin", "editor", "viewer", "moderator", "support-agent"],
  };
  const list = names[resource] || names.products!;
  return list[index % list.length];
}

/** Generate a mock item object for a resource. */
function mockItem(resource: string, index: number): Record<string, unknown> {
  const id = mockId(resource, index);
  const now = new Date().toISOString();
  const daysAgo = (d: number) =>
    new Date(Date.now() - d * 86400000).toISOString();

  return {
    id,
    name: mockName(resource, index),
    status: ["active", "active", "active", "inactive", "pending"][index % 5],
    created_at: daysAgo(30 + index * 7),
    updated_at: daysAgo(index * 2),
    ...(resource.includes("user") || resource.includes("agent")
      ? { email: `user${index}@cartnova.example.com`, role: "member" }
      : {}),
    ...(resource.includes("product") || resource.includes("listing")
      ? { price: Math.round((10 + hash(`${resource}${index}`) % 500) * 100) / 100, currency: "EUR", in_stock: index % 4 !== 0 }
      : {}),
    ...(resource.includes("order") || resource.includes("transaction")
      ? { amount: Math.round((5 + hash(`${resource}${index}`) % 1000) * 100) / 100, currency: "EUR" }
      : {}),
    ...(resource.includes("ticket") || resource.includes("conversation")
      ? { priority: ["low", "medium", "high", "urgent"][index % 4], assignee_id: mockId("agents", index) }
      : {}),
  };
}

/** Generate a mock response based on the operation type. */
function mockResponse(
  ep: EndpointDef,
  params: Record<string, string>
): { status: number; body: unknown } {
  const resource = ep.resource.split("/").pop() || ep.resource;

  switch (ep.operation) {
    case "list":
      return {
        status: 200,
        body: {
          [resource]: Array.from({ length: 5 }, (_, i) => mockItem(resource, i)),
          total: 47,
          page: 1,
          per_page: 20,
        },
      };

    case "get":
    case "details":
    case "detailed":
    case "status":
    case "overview":
    case "config":
    case "get":
      return {
        status: 200,
        body: {
          ...mockItem(resource, hash(params.id || "1") % 100),
          ...(params.id ? { id: params.id } : {}),
        },
      };

    case "create":
    case "register":
    case "upload":
      return {
        status: 201,
        body: {
          ...mockItem(resource, Date.now() % 100),
          id: mockId(resource, Date.now() % 10000),
          created_at: new Date().toISOString(),
        },
      };

    case "update":
    case "patch":
      return {
        status: 200,
        body: {
          ...mockItem(resource, hash(params.id || "1") % 100),
          ...(params.id ? { id: params.id } : {}),
          updated_at: new Date().toISOString(),
        },
      };

    case "delete":
      return { status: 204, body: null };

    case "search":
      return {
        status: 200,
        body: {
          results: Array.from({ length: 3 }, (_, i) => mockItem(resource, i + 10)),
          query: params.q || "",
          total: 3,
        },
      };

    // Action endpoints (approve, reject, cancel, export, etc.)
    default:
      // Export-like operations
      if (ep.operation.includes("export") || ep.operation.includes("download")) {
        return {
          status: 200,
          body: {
            export_id: `exp_${hash(ep.path + Date.now()).toString(36).slice(0, 8)}`,
            status: "processing",
            format: "csv",
            estimated_at: new Date(Date.now() + 60000).toISOString(),
          },
        };
      }

      // Stats/metrics/summary endpoints
      if (
        ep.operation.includes("stats") ||
        ep.operation.includes("metrics") ||
        ep.operation.includes("analytics") ||
        ep.operation.includes("summary") ||
        ep.operation.includes("performance")
      ) {
        return {
          status: 200,
          body: {
            period: "2024-11",
            total: hash(ep.path) % 10000,
            change: `${(hash(ep.path) % 20) - 10}%`,
            breakdown: {
              active: hash(ep.path) % 500,
              inactive: hash(ep.path) % 100,
              pending: hash(ep.path) % 50,
            },
          },
        };
      }

      // State-change actions (approve, reject, cancel, ban, etc.)
      return {
        status: 200,
        body: {
          success: true,
          action: ep.operation,
          ...(params.id ? { id: params.id } : {}),
          message: `${ep.operation} completed successfully`,
          timestamp: new Date().toISOString(),
        },
      };
  }
}

// ─── Route Registration ─────────────────────────────────────────────

/** Build the response handler for a given endpoint. */
function createHandler(ep: EndpointDef) {
  const path = ep.path;
  return (c: any) => {
    const params: Record<string, string> = {};
    // Extract path params
    try {
      if (path.includes(":id")) params.id = c.req.param("id") || "";
      if (path.includes(":item_id")) params.item_id = c.req.param("item_id") || "";
      if (path.includes(":version_id")) params.version_id = c.req.param("version_id") || "";
      if (path.includes(":session_id")) params.session_id = c.req.param("session_id") || "";
      if (path.includes(":image_id")) params.image_id = c.req.param("image_id") || "";
      if (path.includes(":key_id")) params.key_id = c.req.param("key_id") || "";
      if (path.includes(":queue_id")) params.queue_id = c.req.param("queue_id") || "";
      if (path.includes(":cred_id")) params.cred_id = c.req.param("cred_id") || "";
    } catch { /* param not in this path */ }

    // Query params
    const url = new URL(c.req.url);
    params.q = url.searchParams.get("q") || "";

    const { status, body } = mockResponse(ep, params);

    if (status === 204) {
      return c.body(null, 204);
    }
    return c.json(body as object, status as 200);
  };
}

export function createGeneratedRoutes(): Hono {
  const app = new Hono();
  const endpoints = generateAllEndpoints();

  for (const ep of endpoints) {
    const path = ep.path;
    const method = ep.method.toLowerCase();
    const handler = createHandler(ep);

    // Register route with appropriate auth middleware
    if (ep.auth === "jwt") {
      (app as any).on(method, [path], jwtAuth, handler);
    } else if (ep.auth === "apikey") {
      (app as any).on(method, [path], apiKeyAuth, handler);
    } else {
      (app as any).on(method, [path], handler);
    }
  }

  console.log(`[generated] Registered ${endpoints.length} generated endpoints`);
  return app;
}
