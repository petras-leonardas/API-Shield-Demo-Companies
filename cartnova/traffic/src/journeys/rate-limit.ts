// Rate Limit Testing Journey
// Deliberately hammers rate-limited endpoints to trigger 429 responses.
// Also exercises the rate limit status endpoint.

import { api, burstDelay, setClientProfile } from "../http";

export async function rateLimitJourney(): Promise<void> {
  setClientProfile("developer");

  // Check rate limit status first (like a developer would)
  await api("GET", "/api/v2/rate-test/status");
  await burstDelay();

  // Hit the lenient endpoint (10/min limit) — send 12 rapid requests
  for (let i = 0; i < 12; i++) {
    await api("GET", "/api/v2/rate-test/lenient");
    await burstDelay();
  }

  // Hit the strict endpoint (3/min limit) — send 6 rapid requests
  for (let i = 0; i < 6; i++) {
    await api("GET", "/api/v2/rate-test/strict");
    await burstDelay();
  }

  // Also try POST and PUT methods
  await api("POST", "/api/v2/rate-test/lenient", { body: { test: true } });
  await burstDelay();
  await api("PUT", "/api/v2/rate-test/strict", { body: { test: true } });
}
