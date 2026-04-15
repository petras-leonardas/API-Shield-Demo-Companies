// API Versioning Drift Journey
// Simulates clients still using v1 endpoints alongside v2,
// which is common during version migrations. Some clients
// haven't upgraded, some use both, some try v3 (doesn't exist yet).

import { USERS, PRODUCT_IDS, SELLERS, CATEGORY_IDS } from "../config";
import { api, humanDelay, burstDelay, pick, setClientProfile, chance, getOrLogin } from "../http";

/** Old mobile app still on v1 — hasn't been updated */
export async function legacyMobileJourney(): Promise<void> {
  setClientProfile("mobile");
  const user = pick(USERS);
  const token = await getOrLogin(user.email, user.password);
  if (!token) return;

  // Old app uses v1 for everything
  await api("GET", "/api/v1/products", { token });
  await humanDelay();
  await api("GET", `/api/v1/products/${pick(PRODUCT_IDS)}`, { token });
  await humanDelay();
  await api("GET", "/api/v1/categories", { token });
  await humanDelay();
  await api("GET", `/api/v1/categories/${pick(CATEGORY_IDS)}/products`, { token });
  await humanDelay();
  await api("GET", "/api/v1/orders", { token });
  await humanDelay();
  await api("GET", "/api/v1/cart", { token });
  await humanDelay();

  // Old partner API
  const seller = pick(SELLERS);
  await api("GET", "/api/v1/partners/accounts", { apiKey: seller.apiKey });
  await humanDelay();
  await api("GET", "/api/v1/partners/commissions", { apiKey: seller.apiKey });
}

/** Partner integration in mid-migration — uses mix of v1 and v2 */
export async function mixedVersionJourney(): Promise<void> {
  setClientProfile("integration");

  const seller = pick(SELLERS);
  const apiKey = seller.apiKey;

  // Some calls on v1 (legacy code not yet migrated)
  await api("GET", "/api/v1/partners/accounts", { apiKey });
  await humanDelay();
  await api("GET", "/api/v1/partners/reports", { apiKey });
  await humanDelay();

  // Some calls on v2 (new features only available on v2)
  await api("GET", "/api/v2/partners/accounts", { apiKey });
  await humanDelay();
  await api("GET", "/api/v2/partners/commissions", { apiKey });
  await humanDelay();
  await api("GET", "/api/v2/partners/tracking-links", { apiKey });
  await humanDelay();
  await api("GET", "/api/v2/partners/creatives", { apiKey });
}

/** Developer testing v3 (doesn't exist) — common when new version is rumored */
export async function futureVersionJourney(): Promise<void> {
  setClientProfile("developer");
  const user = pick(USERS);
  const token = await getOrLogin(user.email, user.password);
  if (!token) return;

  // Try v3 endpoints (all will 404 but show up in discovery)
  await api("GET", "/api/v3/products", { token });
  await burstDelay();
  await api("GET", "/api/v3/categories", { token });
  await burstDelay();
  await api("GET", "/api/v3/cart", { token });
  await burstDelay();
  await api("GET", "/api/v3/orders", { token });
  await burstDelay();
  await api("POST", "/api/v3/auth/login", { body: { email: "test@test.com", password: "test" } });
  await burstDelay();
  await api("POST", "/api/v3/graphql", {
    token,
    body: { query: "{ products { id name } }", operationName: "TestV3" },
  });
}
