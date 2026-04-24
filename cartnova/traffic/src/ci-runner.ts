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
//
// Budget controls (to stay under the free Workers plan 100K/day):
//   DURATION_MINUTES       — max wall-clock runtime (default 2)
//   MAX_REQUESTS_PER_RUN   — hard request cap per run (default 700)
//   GITHUB_EVENT_NAME      — "schedule" enforces the job rotation table;
//                            "workflow_dispatch" bypasses rotation so manual
//                            triggers always run every job.

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

const DURATION_MS = (parseInt(process.env.DURATION_MINUTES || "2") || 2) * 60 * 1000;
const JOB_TYPE = process.env.JOB_TYPE || "core";
const MAX_REQUESTS_PER_RUN = parseInt(process.env.MAX_REQUESTS_PER_RUN || "700");
const GITHUB_EVENT_NAME = process.env.GITHUB_EVENT_NAME || "workflow_dispatch";

// Hour-based rotation table (UTC). Rotating jobs only fire on scheduled runs
// at these hours. Manual workflow_dispatch bypasses this entirely.
//   core, attacks           → always (every scheduled run)
//   expanded                → 3×/day
//   graphql                 → 3×/day
//   errors-bots             → 3×/day
//   special                 → 3×/day
const ROTATING_JOBS: Record<string, number[]> = {
  expanded: [0, 8, 16],
  graphql: [2, 10, 18],
  "errors-bots": [4, 12, 20],
  special: [6, 14, 22],
};

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
// Reduced from ~5 waves per batch to ~2 waves per batch to hit the
// 20%-of-free-plan budget target.

async function coreBatch(): Promise<void> {
  setClientProfile(randomClientProfile());
  await wave(["browse-1", browsingJourney], ["checkout-1", checkoutJourney], ["user-1", userActivityJourney]);
  setClientProfile(randomClientProfile());
  await wave(["browse-2", browsingJourney], ["checkout-2", checkoutJourney], ["seller-1", sellerJourney]);

  // Monitoring (lightweight, once per batch)
  await safe("monitoring", async () => {
    await api("GET", "/internal/health");
    await api("GET", "/internal/metrics");
  });
}

async function expandedBatch(): Promise<void> {
  // Down from 6 expanded journeys per batch → 2, plus 1 webhook.
  const expanded = pickRandom(EXPANDED_POOL, 2);
  setClientProfile(randomClientProfile());
  await wave(["exp-1", expanded[0]], ["exp-2", expanded[1]]);

  await safe("webhook-1", webhookJourney);
}

async function errorsBotsBatch(): Promise<void> {
  setClientProfile("desktop");
  await safe("errors", errorTrafficJourney);
  await safe("crawler", searchCrawlerJourney);
  // Scanner / uptime / scraper are sampled rather than always running.
  if (Math.random() < 0.5) await safe("scanner", scannerJourney);
  if (Math.random() < 0.5) await safe("uptime", uptimeMonitorJourney);
}

async function graphqlBatch(): Promise<void> {
  // Down from 4 GraphQL sessions per batch → 2 (one browser, one mobile).
  await safe("graphql-browser", graphqlJourney);
  await safe("graphql-mobile", mobileGraphqlJourney);
}

async function specialBatch(): Promise<void> {
  // Sample from the special pool rather than running everything every batch.
  const coin = Math.random();
  if (coin < 0.33) {
    await safe("rate-limit", rateLimitJourney);
  } else if (coin < 0.66) {
    await safe("legacy-mobile", legacyMobileJourney);
  } else {
    await safe("mixed-version", mixedVersionJourney);
  }

  // Occasional future-version probe
  if (Math.random() < 0.2) {
    await safe("future-version", futureVersionJourney);
  }
}

async function attacksBatch(batchNum: number): Promise<void> {
  // Run only 3 of 6 attack patterns per batch, alternating by batch number.
  // Over several batches in a run, all 6 patterns still get exercised.
  if (batchNum % 2 === 0) {
    await safe("5a-rate-abuse", attackRateLimitAbuse);
    await safe("5c-cross-user", attackCrossUserCheckout);
    await safe("5e-bola-enum", attackBolaEnumeration);
  } else {
    await safe("5b-seq-skip", attackSequenceSkipToConfirm);
    await safe("5d-jwt-attacks", attackJwtAttacks);
    await safe("5f-shadow-api", attackShadowApiProbing);
  }
}

// ── Main Loop ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BATCH_FNS: Record<string, (batchNum: number) => Promise<void>> = {
  core: () => coreBatch(),
  expanded: () => expandedBatch(),
  "errors-bots": () => errorsBotsBatch(),
  graphql: () => graphqlBatch(),
  special: () => specialBatch(),
  attacks: (batchNum: number) => attacksBatch(batchNum),
};

function isJobRotationAllowed(): boolean {
  // Manual triggers always run every job.
  if (GITHUB_EVENT_NAME === "workflow_dispatch") return true;

  // Core and attacks always run on schedule.
  if (!(JOB_TYPE in ROTATING_JOBS)) return true;

  // Rotating jobs only run at their designated hours.
  const hour = new Date().getUTCHours();
  return ROTATING_JOBS[JOB_TYPE].includes(hour);
}

async function main() {
  if (!TRAFFIC_ENABLED) {
    console.log("Traffic paused via kill switch (TRAFFIC_ENABLED = false in config.ts). Exiting.");
    process.exit(0);
  }

  if (!isJobRotationAllowed()) {
    const hour = new Date().getUTCHours();
    const allowedHours = ROTATING_JOBS[JOB_TYPE]?.join(", ") || "always";
    console.log(`[${JOB_TYPE}] Not scheduled for hour ${hour} UTC (runs at: ${allowedHours} UTC). Exiting.`);
    process.exit(0);
  }

  const batchFn = BATCH_FNS[JOB_TYPE] || BATCH_FNS.core;
  const deadline = Date.now() + DURATION_MS;
  let batchNum = 0;
  let totalRequests = 0;
  let totalOk = 0;

  console.log(`CartNova Traffic Generator (CI)`);
  console.log(`Job type: ${JOB_TYPE}`);
  console.log(`Target: https://carnova.uk`);
  console.log(`Duration: ${DURATION_MS / 60000} minutes`);
  console.log(`Max requests per run: ${MAX_REQUESTS_PER_RUN}`);
  console.log(`Trigger: ${GITHUB_EVENT_NAME}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  while (Date.now() < deadline) {
    batchNum++;
    console.log(`Batch #${batchNum}:`);
    await batchFn(batchNum);

    const results = getResults();
    const ok = results.filter((r) => r.ok).length;
    console.log(`  ${results.length} requests | ${ok} ok | ${results.length - ok} failed`);

    totalRequests += results.length;
    totalOk += ok;

    if (totalRequests >= MAX_REQUESTS_PER_RUN) {
      console.log(`  Request budget (${MAX_REQUESTS_PER_RUN}) reached. Exiting early.`);
      break;
    }

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
