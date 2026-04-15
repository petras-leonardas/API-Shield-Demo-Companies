#!/usr/bin/env npx tsx
// CartNova Traffic Generator -- CI Runner
//
// Designed for GitHub Actions (or any external CI).
// Runs batches continuously for a fixed duration, then exits cleanly.
//
// Usage:
//   DURATION_MINUTES=4 npx tsx src/ci-runner.ts
//
// Defaults to 4 minutes (leaves 1 minute buffer for a 5-minute cron).

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
import { api, getResults } from "./http";

const DURATION_MS = (parseInt(process.env.DURATION_MINUTES || "4") || 4) * 60 * 1000;

const EXPANDED_POOL = [
  adminJourney, inventoryJourney, marketingJourney, supportJourney,
  financeJourney, logisticsJourney, analyticsJourney, contentJourney,
  partnerJourney, mobileJourney, legacyJourney, internalOpsJourney,
];

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

async function safe(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.error(`  [${name}] ${(e as Error).message}`);
  }
}

async function wave(...fns: [string, () => Promise<void>][]): Promise<void> {
  await Promise.allSettled(fns.map(([name, fn]) => safe(name, fn)));
}

async function runBatch(): Promise<{ total: number; ok: number }> {
  const start = Date.now();

  await wave(["browse-1", browsingJourney], ["browse-2", browsingJourney], ["checkout-1", checkoutJourney]);
  await wave(["browse-3", browsingJourney], ["checkout-2", checkoutJourney], ["user-1", userActivityJourney]);
  await wave(["browse-4", browsingJourney], ["checkout-3", checkoutJourney], ["seller-1", sellerJourney]);
  await wave(["browse-5", browsingJourney], ["checkout-4", checkoutJourney], ["user-2", userActivityJourney]);
  await wave(["browse-6", browsingJourney], ["checkout-5", checkoutJourney], ["browse-7", browsingJourney]);

  const expanded = pickRandom(EXPANDED_POOL, 4);
  await wave([`exp-1`, expanded[0]], [`exp-2`, expanded[1]]);
  await wave([`exp-3`, expanded[2]], [`exp-4`, expanded[3]]);

  await safe("monitoring", async () => {
    await api("GET", "/internal/health");
    await api("GET", "/internal/metrics");
  });

  const results = getResults();
  const ok = results.filter((r) => r.ok).length;
  const dur = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`  ${results.length} requests | ${ok} ok | ${results.length - ok} failed | ${dur}s`);

  return { total: results.length, ok };
}

async function main() {
  const deadline = Date.now() + DURATION_MS;
  let batchNum = 0;
  let totalRequests = 0;
  let totalOk = 0;

  console.log(`CartNova Traffic Generator (CI)`);
  console.log(`Target: https://carnova.uk`);
  console.log(`Duration: ${DURATION_MS / 60000} minutes`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  while (Date.now() < deadline) {
    batchNum++;
    console.log(`Batch #${batchNum}:`);
    const { total, ok } = await runBatch();
    totalRequests += total;
    totalOk += ok;

    // Small pause between batches
    if (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Batches: ${batchNum}`);
  console.log(`Requests: ${totalRequests} total, ${totalOk} ok (${((totalOk / totalRequests) * 100).toFixed(0)}%)`);
  console.log(`Finished: ${new Date().toISOString()}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
