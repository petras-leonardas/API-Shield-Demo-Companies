// CartNova Traffic Generator -- Cron Worker
//
// Runs every minute via Cron trigger. Generates traffic across CartNova's
// full API surface through Cloudflare's proxy so API Shield discovers
// all endpoints.
//
// DESIGN: Fully sequential execution (one journey at a time) to avoid
// Cloudflare Workers' edge-to-same-zone connection limits. This trades
// concurrency for reliability — every request must succeed.

import { checkoutJourney } from "./journeys/checkout";
import { browsingJourney } from "./journeys/browsing";
import { sellerJourney } from "./journeys/seller";
import { userActivityJourney } from "./journeys/user-activity";
import {
  adminJourney,
  inventoryJourney,
  marketingJourney,
  supportJourney,
  financeJourney,
  logisticsJourney,
  analyticsJourney,
  contentJourney,
  partnerJourney,
  mobileJourney,
  legacyJourney,
  internalOpsJourney,
} from "./journeys/expanded";
import { api, getResults, type RequestResult } from "./http";
import { BASE_URL } from "./config";

const EXPANDED_POOL = [
  adminJourney, inventoryJourney, marketingJourney, supportJourney,
  financeJourney, logisticsJourney, analyticsJourney, contentJourney,
  partnerJourney, mobileJourney, legacyJourney, internalOpsJourney,
];

export default {
  async scheduled(event: ScheduledEvent, env: unknown, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runTrafficBatch().then(() => {}));
  },

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/run" && request.method === "POST") {
      const start = Date.now();
      const results = await runTrafficBatch();
      const duration = Date.now() - start;

      return Response.json({
        status: "completed",
        duration_ms: duration,
        requests_made: results.length,
        succeeded: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        results,
      });
    }

    return Response.json({
      name: "CartNova Traffic Generator",
      target: BASE_URL,
      approach: "Fully sequential (1 journey at a time) for reliable edge-to-edge delivery",
      cron: "* * * * *",
    });
  },
};

// ── Helpers ───────────────────────────────────────────────────────

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

async function safe(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.error(`[${name}] failed:`, e);
  }
}

/**
 * Run one traffic batch. Called every minute by Cron.
 *
 * Fully sequential: one journey finishes before the next starts.
 * With reduced delays (100-400ms between requests), each journey
 * takes ~1-3 seconds. 15-18 journeys fit comfortably in 60 seconds.
 */
async function runTrafficBatch(): Promise<RequestResult[]> {

  // Core commerce journeys (sequential)
  await safe("browse-1", browsingJourney);
  await safe("checkout-1", checkoutJourney);
  await safe("browse-2", browsingJourney);
  await safe("checkout-2", checkoutJourney);
  await safe("browse-3", browsingJourney);
  await safe("user-1", userActivityJourney);
  await safe("browse-4", browsingJourney);
  await safe("checkout-3", checkoutJourney);
  await safe("seller-1", sellerJourney);
  await safe("browse-5", browsingJourney);
  await safe("checkout-4", checkoutJourney);
  await safe("user-2", userActivityJourney);

  // Expanded domains (pick 3 random)
  const expanded = pickRandom(EXPANDED_POOL, 3);
  for (const fn of expanded) {
    await safe("expanded", fn);
  }

  // Monitoring
  await safe("monitoring", async () => {
    await api("GET", "/internal/health");
    await api("GET", "/internal/metrics");
  });

  const results = getResults();
  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.length - succeeded;
  console.log(`[batch] ${results.length} requests (${succeeded} ok, ${failed} failed)`);
  return results;
}
