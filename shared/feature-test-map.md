# API Shield Feature Test Map

## Overview

This document maps every API Shield feature to specific, testable scenarios in both demo companies. Use this as a checklist when working through API Shield testing.

Features are organized to follow the testing workflow: discover, manage, validate, protect, monitor. This maps to the recommended onboarding flow in the [API Shield docs](https://developers.cloudflare.com/api-shield/get-started/).

**Total features covered: 19** (vs. the docs' three pillars: Discovery & Management, Posture Management, Runtime Protection, plus Management & Monitoring capabilities).

| Category | Features | Count |
|----------|----------|-------|
| Discovery & Inventory | API Discovery, Endpoint Management, Endpoint Labeling, Schema Learning | 4 |
| Validation & Authentication | Schema Validation, JWT Validation, Mutual TLS | 3 |
| Session & Abuse Detection | Session Identifiers, Authentication Posture, Volumetric Abuse Detection, Sequence Analytics, Sequence Mitigation | 5 |
| Vulnerability Detection | BOLA Detection, Vulnerability Scanner, Sensitive Data Detection, GraphQL Query Protection | 4 |
| Management & Monitoring | API Routing, Developer Portals | 2 |
| Cross-Cutting | Log Mode to Enforcement Transition | 1 |

---

## Discovery & Inventory

### 1. API Discovery

| | CartNova | MeridianBank |
|--|---------|--------------|
| **What to expect** | ~37 endpoints, manageable list | 150-180+ endpoints, overwhelming flat list |
| **Test scenario** | Run discovery. Confirm all endpoints appear. Verify the 3 internal endpoints show up as potentially unintended. | Run discovery. Experience the plateau. Try to make sense of the list. Note where you stall. |
| **What to observe** | Does discovery accurately find all endpoints? Any false positives? How long to review? | How does the flat list feel? Can you distinguish internal from public? Can you identify which endpoints are duplicates vs. unique? Does the GraphQL endpoint appear? |
| **Research connection** | This is the digital-native experience -- manageable, confirmatory. | This is the discovery plateau. Tofarati: *"Really, a thousand and something endpoints? Where do I start from?"* |

### 2. Endpoint Management

| | CartNova | MeridianBank |
|--|---------|--------------|
| **What to expect** | Save all 37 endpoints. Aim for 100% saved. | Try to save endpoints. Struggle with volume and path variable collapsing. |
| **Test scenario** | Save every discovered endpoint. Organize by group (products, cart, checkout, users, sellers, orders, webhooks, internal). | Attempt to save endpoints. Try to collapse path variable variants. Try to ignore deprecated/abandoned endpoints. |
| **Success metric** | Nuno's benchmark: 80% saved, 10% with active rules. CartNova should exceed this. | Track how many you manage to save before giving up. This IS the data. |
| **What to observe** | How long does it take? Is the grouping/labeling workflow intuitive? | How many manual actions to dismiss path variable variants? How long before fatigue sets in? |

### 3. Endpoint Labeling Service

| | CartNova | MeridianBank |
|--|---------|--------------|
| **What to expect** | Clean mapping to managed labels. Easy to organize. | User-defined labels could help tame the sprawl -- but it's manual work on 150+ endpoints. |
| **Test scenario -- managed labels** | Apply managed labels: `cf-log-in` (login), `cf-sign-up` (register), `cf-add-cart` (cart add), `cf-purchase` (checkout confirm), `cf-add-payment` (payment step), `cf-add-post` (reviews). | Apply managed labels to mobile banking: `cf-log-in` (login), `cf-purchase` (transfer). Apply `cf-log-in` to legacy portal `doLogin` too. |
| **Test scenario -- user labels** | Create user-defined labels by endpoint group: `products`, `cart`, `checkout`, `sellers`, `webhooks`, `internal`. Apply to saved endpoints. | Create user-defined labels by team/era: `mobile-2022`, `legacy-portal-2016`, `partners-2019`, `acquired-wm-2020`, `card-services-2014`, `internal-exposed`. Apply to saved endpoints. |
| **Test scenario -- risk labels** | After 24 hours, check which risk labels Cloudflare applied automatically. Expect: `cf-risk-missing-auth` on public product endpoints and internal endpoints. `cf-risk-sensitive` on checkout/user endpoints. | After 24 hours, check risk labels. Expect: `cf-risk-missing-auth` on all internal/debug endpoints. `cf-risk-sensitive` on KYC, card services, debug endpoints. `cf-risk-zombie` on abandoned endpoints with no traffic. `cf-risk-missing-schema` on endpoints without active schemas. |
| **What to observe** | Does labeling improve the management experience? Do managed labels match CartNova's flows? Are risk labels accurate? | Do labels help make sense of the 150+ endpoint list? How long does it take to label enough to feel organized? When an endpoint has both `cf-risk-sensitive` and `cf-risk-missing-auth`, is the compound risk surfaced clearly? |
| **Research connection** | Labels should make the already-manageable list even easier to navigate. | Tests whether organizational tools can break the discovery plateau -- or whether the volume defeats any attempt at organization. |

### 4. Schema Learning

| | CartNova | MeridianBank |
|--|---------|--------------|
| **What to expect** | Cloudflare learns schemas from traffic. Compare learned output against the known OpenAPI spec. | Schema learning is the only option -- no specs exist. Learned schemas are the path to schema validation. |
| **Test scenario** | Save endpoints, run traffic for 24+ hours, export learned schema. Diff against the uploaded `cartnova-api-v2.yaml`. Assess: does the learned schema match reality? Does it detect path variables, query parameters, request body fields? | Save mobile banking endpoints, run traffic for 24+ hours, export learned schema. Review what Cloudflare inferred for `/api/v3/` endpoints. Try exporting for legacy portal endpoints (lower traffic, different conventions). |
| **What to observe** | How accurate is the learned schema vs. the authoritative spec? What's the confidence level? Are request bodies learned correctly for POST/PUT endpoints? | How confident are learned schemas with lower traffic volumes? Do legacy endpoints (camelCase verbs, query params) produce usable schemas? Can you export and share the schema with developers who own those APIs? |
| **Research connection** | CartNova validates schema learning accuracy against ground truth. | MeridianBank tests whether schema learning can bootstrap schema validation for undocumented APIs. Tofarati: *"How confident are we with that learned data?"* |

---

## Validation & Authentication

### 5. Schema Validation

| | CartNova | MeridianBank |
|--|---------|--------------|
| **What to expect** | Upload prepared OpenAPI spec. Clean validation. | No schemas available. Must rely on ML-learned schemas from feature #4. |
| **Test scenario** | Upload `cartnova-api-v2.yaml`. Start in log mode. Send traffic that violates the schema (wrong field types, missing required fields, extra fields). Switch to enforcement. | Import the learned schema for mobile banking endpoints. Start in log mode. Review what Cloudflare validates against. Try applying the learned schema to the full hostname. |
| **What to observe** | How accurate is schema validation? What does the log mode output look like? Is the log-to-enforcement transition smooth? | How confident are you in learned schemas? Would you deploy them in enforcement? Is the learned-schema-to-validation pipeline smooth? |
| **Research connection** | Happy path: spec exists, upload it, validate against it. | Enterprise reality: no specs, must bootstrap from learned schemas. Tofarati: *"How confident are we with that learned data?"* |

### 6. JWT Validation

| | CartNova | MeridianBank |
|--|---------|--------------|
| **What to expect** | Straightforward. All user endpoints use the same JWT format. | Partial. Only mobile banking and the GraphQL gateway use JWT. Legacy portal uses API keys. Wealth management uses Basic Auth. |
| **Test scenario** | Configure JWT validation rules for all endpoints using `Authorization: Bearer`. Test with valid, expired, wrong-issuer, and tampered tokens. | Configure JWT validation for `/api/v3/` endpoints only (mobile banking + GraphQL). Observe that legacy and other endpoints are unprotected by JWT rules. |
| **What to observe** | Is JWT rule setup intuitive? Where does it live in the dashboard? How does it handle different failure modes (expired, wrong issuer, tampered)? | Can you configure JWT rules for a subset of endpoints? Does the dashboard make the coverage gap obvious (legacy endpoints unprotected)? |
| **Research connection** | Emmanuel: JWT validation is *"the most valued but least-known feature."* How discoverable is it? | Demonstrates why enterprise customers can't just "turn on JWT validation" -- their auth is fragmented. |

### 7. Mutual TLS (mTLS)

| | CartNova | MeridianBank |
|--|---------|--------------|
| **What to expect** | Webhook endpoints (`/api/v2/webhooks/payment`, `/api/v2/webhooks/shipping`). | Partner B2B APIs (`/partners/v1/` and `/partners/v2/`). |
| **Test scenario** | Configure mTLS for webhook endpoints. Test with valid client cert, invalid cert, and no cert. | Configure mTLS for partner endpoints. Test with valid/invalid certs. |
| **What to observe** | Is mTLS setup straightforward? How does certificate management work? | Same as CartNova, but in the context of a more complex environment. Does mTLS work alongside the API key requirement (`X-Partner-Key`)? |

---

## Session & Abuse Detection

### 8. Session Identifiers

| | CartNova | MeridianBank |
|--|---------|--------------|
| **What to expect** | Instant. `Authorization: Bearer <JWT>` header. One answer for the whole API surface. | The blocker. 5 different auth mechanisms. No single answer. |
| **Test scenario** | Configure `Authorization` header as session identifier. Done in minutes. Note whether Cloudflare auto-detects it (docs say it will if >1% of successful requests use it). | Attempt to configure. Realize mobile banking uses JWT in `Authorization`, portal uses `X-API-Key`, partners use `X-Partner-Key`, wealth uses `Authorization: Basic`, internal has nothing. Try configuring multiple identifiers. |
| **What to observe** | How quick is the setup? Is the UI clear about what a session identifier is? Does auto-detection work? Can you also configure a JWT claim (e.g., `sub`) as a more stable identifier? | Can you configure multiple session identifiers for different endpoint groups? If not, what's the workaround? What's the cascading impact -- rate limiting, sequence detection, and authentication posture all depend on this. |
| **Research connection** | Emmanuel flagged that session identifiers and sequences are confusingly co-located in the UI despite serving different purposes. | This is the bottleneck that prevents enterprise customers from using rate limiting, sequences, and authentication posture. |

### 9. Authentication Posture

| | CartNova | MeridianBank |
|--|---------|--------------|
| **What to expect** | Public endpoints flagged as `cf-risk-missing-auth`. Authenticated endpoints show 100% auth traffic. Internal endpoints flagged. | Widespread auth issues. Internal services (7 endpoints, no auth) flagged `cf-risk-missing-auth`. Mixed-auth situations on endpoints receiving traffic from both JWT and API key clients. |
| **Test scenario** | Configure session identifiers. Wait 24 hours. Review endpoint auth posture. Confirm product endpoints are `cf-risk-missing-auth` (intentionally public). Confirm internal endpoints are flagged. Confirm checkout/cart/order endpoints show authenticated traffic. Review the auth-over-time chart. | Configure `Authorization` header as session identifier. Wait 24 hours. Review posture. Expect: internal endpoints `cf-risk-missing-auth`, legacy portal endpoints `cf-risk-missing-auth` (uses `X-API-Key`, not `Authorization`), wealth management `cf-risk-mixed-auth` (uses `Authorization: Basic`, may partially match). |
| **What to observe** | Does Authentication Posture correctly distinguish intentionally-public from accidentally-unprotected? Is the auth-over-time chart useful? Can you use `cf.api_gateway.auth_id_present` in custom rules to block unauthenticated traffic to internal endpoints? | How does auth posture behave when the session identifier doesn't cover all auth mechanisms? Does it create noise (false positives on legacy endpoints that ARE authenticated, just not via the configured identifier)? |
| **Research connection** | Tests whether Authentication Posture provides actionable signal for a well-organized API. | Tests the edge case: fragmented auth where no single identifier covers the full surface. Does posture analysis help or mislead? |

### 10. Volumetric Abuse Detection

| | CartNova | MeridianBank |
|--|---------|--------------|
| **What to expect** | Per-session, per-endpoint rate limit recommendations appear in Endpoint Management after 24+ hours. Product search and browsing should have clear recommendations. | Recommendations may appear for mobile banking endpoints (sufficient sessions). Legacy and other endpoints may lack recommendations due to fewer distinct sessions or missing session identifier coverage. |
| **Test scenario** | Configure session identifier. Run traffic for 24+ hours with 50+ distinct sessions. Check Endpoint Management for rate limit recommendations on `GET /api/v2/products/search` and `GET /api/v2/products`. Review p50/p90/p99 values and confidence scores. Create an Advanced Rate Limiting rule based on the recommendation. Run the rate limit abuse attack (5a). | Configure session identifier. Run traffic for 24+ hours. Check which endpoints receive recommendations and which don't. Compare recommendations on mobile banking (many sessions) vs. legacy portal (fewer sessions). Note confidence scores. |
| **What to observe** | Are the recommended rate limits sensible? What confidence level? Does the rate limit catch the abuse pattern? Is the AI-recommended threshold better than a manual guess? Can you rate limit by JWT claim (e.g., user tier)? | Do recommendations appear for endpoints with imperfect session identifiers? Is the confidence score lower for low-traffic endpoints? Does the system handle mixed auth gracefully? |
| **Research connection** | Tests the happy path for AI-recommended per-session rate limits. | Tests whether Volumetric Abuse Detection works when session identifiers are imperfect. Tamires: *"We can't like we can only map what the customer knows."* |

### 11. Sequence Analytics

| | CartNova | MeridianBank |
|--|---------|--------------|
| **What to expect** | The checkout flow should appear as a high-correlation-score sequence. Browsing sequences should also surface. | The modern transfer flow should appear. The legacy transfer flow may or may not surface depending on session identifier coverage. |
| **Test scenario** | Run traffic for 24+ hours. Review Sequence Analytics. Identify top sequences by correlation score. Verify the checkout flow (login, browse, cart, checkout, shipping, payment, confirm) ranks highly. Check if attack patterns (sequence violations) create visible anomalies. | Run traffic for 24+ hours. Review Sequence Analytics. Identify which sequences surface. Check if both modern and legacy transfer flows appear. Note which endpoints within sequences are protected and which aren't. |
| **What to observe** | Does the checkout flow rank highly? Are correlation scores intuitive? Can you distinguish critical business flows from casual browsing? Does this naturally lead to setting up sequence mitigation? | Do sequences surface for endpoints using different auth mechanisms? Can you see both transfer flows? Does analytics help the security team discover flows they didn't know about? |
| **Research connection** | Nuno: *"I find that sequences is the most surprising one."* Test whether analytics makes sequences less surprising and more actionable. | Tests whether Sequence Analytics helps an enterprise team discover business flows across fragmented APIs. |

### 12. Sequence Mitigation

| | CartNova | MeridianBank |
|--|---------|--------------|
| **What to expect** | Clean 7-step checkout flow. Natural sequence to protect. | Two parallel transfer flows (modern and legacy). Which one do you protect? |
| **Test scenario** | Define the checkout sequence (login, browse, cart, checkout, shipping, payment, confirm). Run sequence violation attacks (skip to confirm, skip payment). Verify enforcement blocks violations. | Define the modern transfer sequence (login, MFA, accounts, balance, transfer, status). Run MFA bypass attack. Note the legacy flow is unprotected. |
| **What to observe** | Is sequence definition intuitive? Does it catch violations? What's the enforcement experience? | Can you protect one flow without the other? Does the dashboard surface the coverage gap? |
| **Research connection** | Nuno: *"I find that sequences is the most surprising one."* Is it surprising or confusing? | Even if you set up sequences on one flow, parallel legacy flows remain unprotected. |

---

## Vulnerability Detection

### 13. BOLA Vulnerability Detection

| | CartNova | MeridianBank |
|--|---------|--------------|
| **What to expect** | Risk labels on endpoints with path variables: `cf-risk-bola-enumeration` on order/checkout endpoints, potentially `cf-risk-bola-pollution` if parameter pollution is detected. | Risk labels on account endpoints, internal risk-engine endpoint. BOLA enumeration across account IDs on unauthenticated internal endpoints is especially critical. |
| **Test scenario** | Run BOLA enumeration attacks (iterate through order IDs, checkout IDs). Wait for daily risk scan. Check if `cf-risk-bola-enumeration` or `cf-risk-bola-pollution` labels appear. | Run BOLA enumeration on account IDs (both modern and legacy). Run enumeration on `/internal/risk-engine/score/{customer_id}` (no auth). Check for risk labels. |
| **What to observe** | Are the labels actionable? Tofarati: *"This endpoint has been tagged as being vulnerable to BOLA type attack. But what do I do with that, right?"* Check recommended actions. | Same question, with higher stakes -- vulnerable endpoints have no auth. Do labels reflect the severity of unauthenticated BOLA? |

### 14. Vulnerability Scanner

| | CartNova | MeridianBank |
|--|---------|--------------|
| **What to expect** | Active BOLA scan using the OpenAPI spec and two user credential sets. Scanner probes endpoints to test if one user can access another's resources. | Cannot use directly -- requires an OpenAPI schema. But if a learned schema is exported (feature #4), it could potentially be used as input. |
| **Test scenario** | Prepare two credential sets via the API: Owner (User A's JWT in `Authorization` header) and Attacker (User B's JWT). Upload CartNova's OpenAPI spec as the scan input. Run a BOLA scan targeting checkout, order, and cart endpoints. Review the scan report. | If a learned schema has been exported for mobile banking endpoints, attempt to use it as the scanner input. This tests whether the discovery, schema learning, vulnerability scanning pipeline works for enterprises without pre-existing specs. |
| **What to observe** | Does the scanner identify BOLA-vulnerable endpoints? Which endpoints show warnings? Are results actionable? How long does the scan take? | Can a learned schema serve as scanner input? If so, does the scan produce meaningful results? This would be significant -- enterprises could go from discovery to schema learning to vulnerability scanning without ever writing a spec. |
| **Research connection** | Tests the full active-scanning pipeline for a well-documented API. | Tests whether the enterprise path (no specs, learned schemas, scanning) is viable. |

### 15. Sensitive Data Detection

| | CartNova | MeridianBank |
|--|---------|--------------|
| **What to expect** | PII in user profiles, checkout, and order endpoints. Standard patterns (email, phone, address). `cf-risk-sensitive` labels on affected endpoints. | Critical data everywhere: SSNs in KYC, card numbers in card services, DB connection strings in debug endpoints. Much on unauthenticated endpoints. |
| **Test scenario** | Run traffic. Check if detection flags PII in `/users/me`, `/checkout/{id}/shipping`, `/checkout/{id}/payment`, `/orders/{id}`. Verify `cf-risk-sensitive` labels appear. | Run traffic. Check for SSN in `/partners/v1/kyc/verify`, card numbers in `/cardservices/xmlapi/getCardStatus`, DB strings in `/debug/db-status`. Cross-reference with `cf-risk-missing-auth` for compound risk. |
| **What to observe** | How accurate is detection? Does it catch email, phone, address? Any false positives on product data? | Does it catch SSN/tax ID formats? Does it flag database connection strings? When an endpoint is both `cf-risk-sensitive` AND `cf-risk-missing-auth`, is the compound risk surfaced clearly? |
| **Research connection** | Tamires noted detection works for US/EU patterns but lacks regional PII detection (Brazilian CPF, etc.). | Enterprise case: sensitive data scattered across teams. Nobody knows where PII lives until detection finds it. |

### 16. GraphQL Query Protection

| | CartNova | MeridianBank |
|--|---------|--------------|
| **What to expect** | N/A -- CartNova does not use GraphQL. | MeridianBank has a GraphQL gateway (`POST /api/v3/graphql`) built by the mobile team in 2023. It consolidates account and transaction queries over a single endpoint. |
| **Test scenario** | N/A | Configure GraphQL protection on the `/api/v3/graphql` path. Set query depth limit (e.g., max depth 10) and query size limit (e.g., 10KB). Run normal traffic (simple account/transaction queries). Then run attacks: deeply nested queries (depth 20+), excessively large queries (50KB+), and introspection queries. |
| **What to observe** | N/A | Does the depth limit catch nested attacks? Does the size limit work? Is configuration intuitive? Does it correctly pass normal queries while blocking malicious ones? How does GraphQL protection interact with other API Shield features (does discovery find the GraphQL endpoint, does schema validation apply)? |
| **Research connection** | N/A | Tests GraphQL protection in a realistic enterprise context: a GraphQL endpoint added as a modernization effort alongside legacy REST APIs. |

---

## Management & Monitoring

### 17. API Routing

| | CartNova | MeridianBank |
|--|---------|--------------|
| **What to expect** | Minimal use case -- CartNova's API is already well-organized. Could test as a versioning migration tool. | Strong use case: route a unified external API to different internal backends. Could consolidate the fragmented surface. |
| **Test scenario** | Create a route from a `/api/v3/products/{id}` source to the existing `/api/v2/products/{id}` target. Verify path variables are forwarded correctly. Test variable reordering. | Create routes to unify the transfer flow: route `/api/unified/accounts` to `/api/v3/accounts` as a facade. Route `/api/unified/transfer` to `/api/v3/accounts/{id}/transfers`. Test whether routing could let you apply security rules to the unified paths rather than managing each backend individually. |
| **What to observe** | Is route creation intuitive? Does the route work? How long for changes to propagate (~5 min per docs)? | Can routing help consolidate a fragmented API surface without changing backend code? Is this a viable quick-win for enterprises stuck at the discovery plateau -- apply rules to unified routes instead of hundreds of individual endpoints? |
| **Research connection** | Minor test -- CartNova doesn't need routing. | Tests whether API Routing could be an "escape hatch" for enterprises: a way to make incremental progress without full API modernization. |

### 18. Developer Portals

| | CartNova | MeridianBank |
|--|---------|--------------|
| **What to expect** | Generate a portal from the uploaded OpenAPI spec. Clean, interactive Redoc documentation. | Generate a portal from an exported learned schema. Documentation auto-generated from traffic patterns. |
| **Test scenario** | Generate a developer portal from `cartnova-api-v2.yaml`. Review the Redoc portal. Verify all 37 endpoints are documented. Deploy to Cloudflare Pages. | Export the learned schema for MeridianBank's mobile banking endpoints. Generate a portal from the export. Review what auto-generated documentation looks like for APIs that were never intentionally documented. |
| **What to observe** | How does the portal look? Is the documentation useful? Could this serve as actual developer docs? | What does auto-generated documentation look like for messy APIs? Is the learned schema detailed enough for useful docs? Could this help teams answer "who owns this?" by sharing the portal with developers? |
| **Research connection** | Tests the happy path: spec to portal. | Tests whether auto-generated portals could help enterprises share API knowledge across teams, potentially breaking the coordination deadlock. |

---

## Cross-Cutting

### 19. Log Mode to Enforcement Transition

| | CartNova | MeridianBank |
|--|---------|--------------|
| **What to expect** | Smooth transition. Start in log mode, review violations, switch to enforcement. | Likely never reaches enforcement. The journey stalls at discovery/endpoint management. |
| **Test scenario** | Configure schema validation in log mode. Run traffic for 1 hour. Review logged violations in Security Events. Switch to enforcement. Verify blocking works. Repeat for JWT validation and sequence mitigation. | If you manage to get any rules configured, start them in log mode. Note how long it takes to build enough confidence to enforce. Track how many features reach enforcement vs. stay in log mode. |
| **What to observe** | What does the log mode dashboard show? Is the data actionable? What does the enforcement switch feel like? How many features reach full enforcement? | Does log mode help build confidence, or does it add another step that delays progress? How many features even get to log mode, let alone enforcement? |
| **Research connection** | The log-to-enforcement transition is where value becomes concrete. If CartNova can't get here, no one can. | This is the "log mode trap." Customers stay in log mode indefinitely because they never build enough confidence to enforce. |

---

## Quick Reference: Feature Coverage by Company

| # | Feature | CartNova | MeridianBank | Docs Reference |
|---|---------|----------|--------------|----------------|
| 1 | API Discovery | Primary test | Primary test | [Link](https://developers.cloudflare.com/api-shield/security/api-discovery/) |
| 2 | Endpoint Management | Primary test | Primary test | [Link](https://developers.cloudflare.com/api-shield/management-and-monitoring/endpoint-management/) |
| 3 | Endpoint Labeling | Primary test | Primary test | [Link](https://developers.cloudflare.com/api-shield/management-and-monitoring/endpoint-labels/) |
| 4 | Schema Learning | Validation test | Primary test | [Link](https://developers.cloudflare.com/api-shield/management-and-monitoring/endpoint-management/schema-learning/) |
| 5 | Schema Validation | Primary test | Secondary test | [Link](https://developers.cloudflare.com/api-shield/security/schema-validation/) |
| 6 | JWT Validation | Primary test | Partial test | [Link](https://developers.cloudflare.com/api-shield/security/jwt-validation/) |
| 7 | Mutual TLS | Primary test | Primary test | [Link](https://developers.cloudflare.com/api-shield/security/mtls/) |
| 8 | Session Identifiers | Primary test | Primary test (blocker) | [Link](https://developers.cloudflare.com/api-shield/management-and-monitoring/session-identifiers/) |
| 9 | Authentication Posture | Secondary test | Primary test | [Link](https://developers.cloudflare.com/api-shield/security/authentication-posture/) |
| 10 | Volumetric Abuse Detection | Primary test | Partial test | [Link](https://developers.cloudflare.com/api-shield/security/volumetric-abuse-detection/) |
| 11 | Sequence Analytics | Primary test | Primary test | [Link](https://developers.cloudflare.com/api-shield/security/sequence-analytics/) |
| 12 | Sequence Mitigation | Primary test | Partial test | [Link](https://developers.cloudflare.com/api-shield/security/sequence-mitigation/) |
| 13 | BOLA Detection | Primary test | Primary test | [Link](https://developers.cloudflare.com/api-shield/security/bola-vulnerability-detection/) |
| 14 | Vulnerability Scanner | Primary test | Stretch test | [Link](https://developers.cloudflare.com/api-shield/security/vulnerability-scanner/) |
| 15 | Sensitive Data Detection | Primary test | Primary test | [Link](https://developers.cloudflare.com/api-shield/management-and-monitoring/endpoint-management/#sensitive-data-detection) |
| 16 | GraphQL Protection | N/A | Primary test | [Link](https://developers.cloudflare.com/api-shield/security/graphql-protection/) |
| 17 | API Routing | Secondary test | Primary test | [Link](https://developers.cloudflare.com/api-shield/management-and-monitoring/api-routing/) |
| 18 | Developer Portals | Primary test | Secondary test | [Link](https://developers.cloudflare.com/api-shield/management-and-monitoring/developer-portal/) |
| 19 | Log to Enforcement | Primary test | Primary test | [Link](https://developers.cloudflare.com/api-shield/get-started/) |
