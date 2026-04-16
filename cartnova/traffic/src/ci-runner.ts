#!/usr/bin/env npx tsx
// CartNova Traffic Generator -- CI Runner
//
// Designed for GitHub Actions. Runs batches for a fixed duration, then exits.
// Supports a JOB_TYPE env var to run different traffic profiles in parallel.
//
// Job types:
//   core        — checkout, browsing, user activity, seller
//   expanded    — admin, inventory, finance, marketing + webhooks
//   errors-bots — error traffic, crawlers, scanners, scrapers
//   graphql     — GraphQL queries and mutations
//   special     — rate limiting, versioning drift, mixed patterns
//   attacks     — API Shield attack patterns (5a-5f): rate limit abuse,
//                 sequence violations, BOLA, JWT attacks, enumeration,
//                 shadow API probing

import { checkoutJourney } from "./journeys/checkout";
import { browsingJourney } from "./journeys/browsing";
import { sellerJourney } from "./journeys/seller";
import { userActivityJourney } from "./journeys/user-activity";
import {
  adminJourney, inventoryJourney, marketingJourney, supportJourney,
  financeJourney, logisticsJourney, analyticsJourney, contentJourney,
  partnerJourney, mobileJourney, legacyJourney, internalOpsJourney,
} from "./journeys/expanded";
import { errorTrafficJourney } from "./journeys/errors";
import { searchCrawlerJourney, scannerJourney, uptimeMonitorJourney, scraperJourney } from "./journeys/bots";
import { webhookJourney } from "./journeys/webhooks";
import { graphqlJourney, mobileGraphqlJourney } from "./journeys/graphql";
import { rateLimitJourney } from "./journeys/rate-limit";
import { legacyMobileJourney, mixedVersionJourney, futureVersionJourney } from "./journeys/versioning";
import {
  allAttacks, attackRateLimitAbuse, attackSequenceSkipToConfirm,
  attackCrossUserCheckout, attackJwtAttacks, attackBolaEnumeration,
  attackShadowApiProbing,
} from "./journeys/attacks";
import { api, getResults, setClientProfile, randomClientProfile } from "./http";
import { TRAFFIC_ENABLED } from "./config";

const DURATION_MS = (parseInt(process.env.DURATION_MINUTES || "4") || 4) * 60 * 1000;
const JOB_TYPE = process.env.JOB_TYPE || "core";

const EXPANDED_POOL = [
  adminJourney, inventoryJourney, marketingJourney, supportJourney,
  financeJourney, logisticsJourney, analyticsJourney, contentJourney,
  partnerJourney, mobileJourney, legacyJourney, internalOpsJourney,
];

function pickRandom<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
}

async function safe(name: string, fn: () => Promise<void>): Promise<void> {
  try { await fn(); } catch (e) { console.error(`  [${name}] ${(e as Error).message}`); }
}

async function wave(...fns: [string, () => Promise<void>][]): Promise<void> {
  await Promise.allSettled(fns.map(([name, fn]) => safe(name, fn)));
}

// ── Batch Definitions Per Job Type ──────────────────────────────────

async function coreBatch(): Promise<void> {
  setClientProfile(randomClientProfile());
  await wave(["browse-1", browsingJourney], ["browse-2", browsingJourney], ["checkout-1", checkoutJourney]);
  setClientProfile(randomClientProfile());
  await wave(["browse-3", browsingJourney], ["checkout-2", checkoutJourney], ["user-1", userActivityJourney]);
  setClientProfile(randomClientProfile());
  await wave(["browse-4", browsingJourney], ["checkout-3", checkoutJourney], ["seller-1", sellerJourney]);
  setClientProfile(randomClientProfile());
  await wave(["browse-5", browsingJourney], ["checkout-4", checkoutJourney], ["user-2", userActivityJourney]);
  setClientProfile(randomClientProfile());
  await wave(["browse-6", browsingJourney], ["checkout-5", checkoutJourney], ["browse-7", browsingJourney]);

  await safe("monitoring", async () => {
    await api("GET", "/internal/health");
    await api("GET", "/internal/metrics");
  });
}

async function expandedBatch(): Promise<void> {
  const expanded = pickRandom(EXPANDED_POOL, 6);
  setClientProfile("desktop");
  await wave(["exp-1", expanded[0]], ["exp-2", expanded[1]]);
  setClientProfile("mobile");
  await wave(["exp-3", expanded[2]], ["exp-4", expanded[3]]);
  setClientProfile("integration");
  await wave(["exp-5", expanded[4]], ["exp-6", expanded[5]]);

  await safe("webhook-1", webhookJourney);
  await safe("webhook-2", webhookJourney);
}

async function errorsBotsBatch(): Promise<void> {
  setClientProfile("desktop");
  await safe("errors", errorTrafficJourney);
  await safe("crawler", searchCrawlerJourney);
  await safe("scanner", scannerJourney);
  await safe("uptime", uptimeMonitorJourney);
  if (Math.random() < 0.5) {
    await safe("scraper", scraperJourney);
  }
  await safe("webhook", webhookJourney);
}

async function graphqlBatch(): Promise<void> {
  // Browser GraphQL session
  await safe("graphql-browser", graphqlJourney);
  // Mobile GraphQL session
  await safe("graphql-mobile", mobileGraphqlJourney);
  // Another browser session with different user
  await safe("graphql-browser-2", graphqlJourney);
  // Another mobile session
  await safe("graphql-mobile-2", mobileGraphqlJourney);
}

async function specialBatch(): Promise<void> {
  // Rate limiting tests
  await safe("rate-limit", rateLimitJourney);
  // Legacy mobile on v1
  await safe("legacy-mobile", legacyMobileJourney);
  // Partner mid-migration (v1+v2 mix)
  await safe("mixed-version", mixedVersionJourney);
  // Developer trying v3
  await safe("future-version", futureVersionJourney);
  // Extra browsing for volume
  setClientProfile(randomClientProfile());
  await wave(["browse-1", browsingJourney], ["browse-2", browsingJourney]);
}

async function attacksBatch(): Promise<void> {
  // Run all 6 attack patterns per batch. Each pattern targets a
  // specific API Shield feature. Interleave with legitimate traffic
  // so the contrast between normal and malicious is visible in analytics.
  await safe("5a-rate-abuse", attackRateLimitAbuse);
  await safe("5b-seq-skip", attackSequenceSkipToConfirm);
  await safe("5c-cross-user", attackCrossUserCheckout);
  await safe("5d-jwt-attacks", attackJwtAttacks);
  await safe("5e-bola-enum", attackBolaEnumeration);
  await safe("5f-shadow-api", attackShadowApiProbing);

  // Interleave some legitimate traffic for contrast
  setClientProfile(randomClientProfile());
  await wave(["legit-browse", browsingJourney], ["legit-checkout", checkoutJourney]);
}

// ── Main Loop ───────────────────────────────────────────────────────

const BATCH_FNS: Record<string, () => Promise<void>> = {
  core: coreBatch,
  expanded: expandedBatch,
  "errors-bots": errorsBotsBatch,
  graphql: graphqlBatch,
  special: specialBatch,
  attacks: attacksBatch,
};

async function main() {
  if (!TRAFFIC_ENABLED) {
    console.log("Traffic paused via kill switch (TRAFFIC_ENABLED = false in config.ts). Exiting.");
    process.exit(0);
  }

  const batchFn = BATCH_FNS[JOB_TYPE] || coreBatch;
  const deadline = Date.now() + DURATION_MS;
  let batchNum = 0;
  let totalRequests = 0;
  let totalOk = 0;

  console.log(`CartNova Traffic Generator (CI)`);
  console.log(`Job type: ${JOB_TYPE}`);
  console.log(`Target: https://carnova.uk`);
  console.log(`Duration: ${DURATION_MS / 60000} minutes`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  while (Date.now() < deadline) {
    batchNum++;
    console.log(`Batch #${batchNum}:`);
    await batchFn();

    const results = getResults();
    const ok = results.filter((r) => r.ok).length;
    console.log(`  ${results.length} requests | ${ok} ok | ${results.length - ok} failed`);

    totalRequests += results.length;
    totalOk += ok;

    if (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Batches: ${batchNum}`);
  console.log(`Requests: ${totalRequests} total, ${totalOk} ok (${totalRequests > 0 ? ((totalOk / totalRequests) * 100).toFixed(0) : 0}%)`);
  console.log(`Finished: ${new Date().toISOString()}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
