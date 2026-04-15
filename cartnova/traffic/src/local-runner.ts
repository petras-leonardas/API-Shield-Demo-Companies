#!/usr/bin/env npx tsx
// CartNova Traffic Generator -- Local Runner
//
// Run this from your terminal to generate traffic that goes through
// Cloudflare's full security pipeline (unlike the Cron Worker which
// bypasses security analytics due to same-account routing).
//
// Usage:
//   cd cartnova/traffic
//   npx tsx src/local-runner.ts
//
// Runs indefinitely, executing one batch per minute.
// Press Ctrl+C to stop.

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

const EXPANDED_POOL = [
  { name: "admin", fn: adminJourney },
  { name: "inventory", fn: inventoryJourney },
  { name: "marketing", fn: marketingJourney },
  { name: "support", fn: supportJourney },
  { name: "finance", fn: financeJourney },
  { name: "logistics", fn: logisticsJourney },
  { name: "analytics", fn: analyticsJourney },
  { name: "content", fn: contentJourney },
  { name: "partner", fn: partnerJourney },
  { name: "mobile", fn: mobileJourney },
  { name: "legacy", fn: legacyJourney },
  { name: "internal-ops", fn: internalOpsJourney },
];

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

async function safe(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.error(`  [${name}] failed:`, (e as Error).message);
  }
}

async function runBatch(): Promise<void> {
  const start = Date.now();

  // Core commerce -- run 3 at a time (local machine has no connection limits)
  const wave = async (...fns: [string, () => Promise<void>][]) => {
    await Promise.allSettled(fns.map(([name, fn]) => safe(name, fn)));
  };

  await wave(["browse-1", browsingJourney], ["browse-2", browsingJourney], ["checkout-1", checkoutJourney]);
  await wave(["browse-3", browsingJourney], ["checkout-2", checkoutJourney], ["user-1", userActivityJourney]);
  await wave(["browse-4", browsingJourney], ["checkout-3", checkoutJourney], ["seller-1", sellerJourney]);
  await wave(["browse-5", browsingJourney], ["checkout-4", checkoutJourney], ["user-2", userActivityJourney]);
  await wave(["browse-6", browsingJourney], ["checkout-5", checkoutJourney], ["browse-7", browsingJourney]);

  // Expanded domains -- pick 4 random
  const expanded = pickRandom(EXPANDED_POOL, 4);
  await wave([expanded[0].name, expanded[0].fn], [expanded[1].name, expanded[1].fn]);
  await wave([expanded[2].name, expanded[2].fn], [expanded[3].name, expanded[3].fn]);

  // Monitoring
  await safe("monitoring", async () => {
    await api("GET", "/internal/health");
    await api("GET", "/internal/metrics");
  });

  const results = getResults();
  const ok = results.filter((r) => r.ok).length;
  const fail = results.length - ok;
  const dur = ((Date.now() - start) / 1000).toFixed(1);
  const s0 = results.filter((r) => r.status === 0).length;

  console.log(
    `[batch] ${results.length} requests | ${ok} ok | ${fail} failed (${s0} conn errors) | ${dur}s`
  );
}

// ── Main Loop ───────────────────────────────────────────────────────

async function main() {
  console.log("CartNova Traffic Generator (Local)");
  console.log("Target: https://carnova.uk");
  console.log("Running a batch every 60 seconds. Press Ctrl+C to stop.\n");

  let batchNum = 0;

  while (true) {
    batchNum++;
    console.log(`\n--- Batch #${batchNum} (${new Date().toLocaleTimeString()}) ---`);
    await runBatch();

    // Wait until the next minute mark
    const elapsed = Date.now() % 60000;
    const waitMs = Math.max(60000 - elapsed, 5000);
    console.log(`  Waiting ${(waitMs / 1000).toFixed(0)}s until next batch...`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
}

main().catch(console.error);
