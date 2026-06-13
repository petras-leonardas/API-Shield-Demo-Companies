# API Shield Feature Test Map

## Overview

This document maps every API Shield feature to testable scenarios in the lab. Use it as a checklist when working through API Shield testing.

Features follow the testing workflow: discover, manage, validate, protect, monitor — matching the [API Shield docs' recommended onboarding flow](https://developers.cloudflare.com/api-shield/get-started/).

> **Note.** This project originally mapped each feature against two companies: CartNova (digital-native, happy path) and MeridianBank (enterprise, failure path). MeridianBank has been abandoned. The enterprise-sprawl scenario will instead be reproduced using the Emmanuel-style lab — a stack of off-the-shelf Docker images (Swagger Petstore, OWASP Juice Shop, Grafana, Kibana, httpbin) published as subdomains on the same Cloudflare zone via a `cloudflared` tunnel. Where a feature benefits from that second angle, it has its own subsection below. See `Emmanuel's setup/` and `AGENTS.md` for the reference implementation.

**Total features covered: 19**

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

**CartNova:** ~37 endpoints, manageable list. Run discovery, confirm all endpoints appear, verify the 3 internal endpoints show up as potentially unintended.

**What to observe:** Does discovery accurately find all endpoints? Any false positives? How long to review?

**Research connection:** This is the digital-native experience — manageable and confirmatory.

**Emmanuel-style lab (planned):** Once the imaged apps are live on subdomains of the CartNova zone, Discovery should start surfacing Petstore, Juice Shop, Grafana, Kibana, and httpbin endpoints alongside CartNova's. This is the moment to capture what "many apps under one zone" looks like in Discovery — specifically whether you can distinguish business endpoints from an observability tool's internal API, and whether the sheer volume recreates the *"a thousand and something endpoints, where do I start from?"* experience Tofarati described.

### 2. Endpoint Management

**CartNova:** Save every discovered endpoint. Organise by group (products, cart, checkout, users, sellers, orders, webhooks, internal).

**Success metric:** Nuno's benchmark — 80% saved, 10% with active rules. CartNova should exceed this.

**What to observe:** How long does it take? Is the grouping/labeling workflow intuitive?

**Emmanuel-style lab:** Once the imaged apps are discovered, try to save their endpoints too. Observe how much additional manual effort is required — each imaged app effectively doubles the endpoint count without contributing business value, so this is a good proxy for the effort an enterprise customer faces.

### 3. Endpoint Labeling Service

**CartNova — managed labels:** Apply `cf-log-in` (login), `cf-sign-up` (register), `cf-add-cart` (cart add), `cf-purchase` (checkout confirm), `cf-add-payment` (payment step), `cf-add-post` (reviews).

**CartNova — user labels:** Create user-defined labels by endpoint group — `products`, `cart`, `checkout`, `sellers`, `webhooks`, `internal` — and apply to saved endpoints.

**CartNova — risk labels:** After 24 hours, check which risk labels Cloudflare applied automatically. Expect `cf-risk-missing-auth` on public product endpoints and internal endpoints, `cf-risk-sensitive` on checkout/user endpoints.

**What to observe:** Does labeling improve the management experience? Do managed labels match CartNova's flows? Are risk labels accurate?

**Research connection:** Labels should make the already-manageable list even easier to navigate.

**Emmanuel-style lab:** Create a label for each imaged app (`petstore`, `juice-shop`, `grafana`, `httpbin`) and use it to partition the zone. Observe whether per-app labels make a mixed zone tractable, or whether the Discovery view remains noisy regardless.

### 4. Schema Learning

**CartNova:** Save endpoints, run traffic for 24+ hours, export the learned schema. Diff against the uploaded `cartnova-api-v2.yaml`. Assess whether the learned schema detects path variables, query parameters, and request body fields correctly.

**What to observe:** How accurate is the learned schema vs. the authoritative spec? What's the confidence level? Are request bodies learned correctly for POST/PUT endpoints?

**Research connection:** CartNova validates schema learning accuracy against ground truth.

**Emmanuel-style lab:** The Petstore comes with its own OpenAPI spec, so you can compare Cloudflare's learned schema against the real thing for a second, independent API. Grafana and Juice Shop, by contrast, have no OpenAPI spec readily available — so the learned schema is the only schema that will ever exist for them, which is a more honest stand-in for the enterprise case. Tofarati: *"How confident are we with that learned data?"*

---

## Validation & Authentication

### 5. Schema Validation

**CartNova:** Upload `cartnova-api-v2.yaml` (not yet written). Start in log mode. Send traffic that violates the schema (wrong field types, missing required fields, extra fields). Switch to enforcement.

**What to observe:** How accurate is schema validation? What does the log mode output look like? Is the log-to-enforcement transition smooth?

**Research connection:** Happy path — spec exists, upload it, validate against it.

**Emmanuel-style lab:** Upload the Petstore OpenAPI spec as a second validation target. For Juice Shop, Grafana, and httpbin — apps with no real OpenAPI spec — try using the learned schema from feature #4 as the validation input. This is the enterprise reality: no specs, must bootstrap from learned schemas. Tofarati: *"How confident are we with that learned data?"*

### 6. JWT Validation

**CartNova:** Configure JWT validation rules for all endpoints using `Authorization: Bearer`. Test with valid, expired, wrong-issuer, and tampered tokens.

**What to observe:** Is JWT rule setup intuitive? Where does it live in the dashboard? How does it handle different failure modes?

**Research connection:** Emmanuel: JWT validation is *"the most valued but least-known feature."* How discoverable is it?

**Emmanuel-style lab:** Replicate Emmanuel's Petstore JWT demo end-to-end. See `Emmanuel's setup/wiki-02-securing-apis-with-jwt-validation.md` for the Python JWT generator and `wiki-03-implementing-jwt-validation-for-petstore-swagger-api.md` for the step-by-step rule setup. The sensitive `GET /api/v3/store/inventory` endpoint should block without a token and pass with one. This is the single most valuable demo in the whole lab.

### 7. Mutual TLS (mTLS)

**CartNova:** Configure mTLS for the webhook endpoints (`/api/v2/webhooks/payment`, `/api/v2/webhooks/shipping`). Test with valid client cert, invalid cert, and no cert.

**What to observe:** Is mTLS setup straightforward? How does certificate management work?

**Emmanuel-style lab:** Not currently planned. None of the imaged apps have a natural mTLS use case.

---

## Session & Abuse Detection

### 8. Session Identifiers

**CartNova:** Configure `Authorization` header as session identifier for buyer traffic, and `X-Seller-Key` for seller traffic. Note whether Cloudflare auto-detects the `Authorization` header (docs say it will if >1% of successful requests use it). Optionally configure a JWT claim (for example `sub`) as a more stable identifier, since tokens expire every 15 minutes.

**What to observe:** How quick is the setup? Is the UI clear about what a session identifier is? Does auto-detection work? Can multiple identifiers be configured for different endpoint groups, or only zone-wide?

**Research connection:** Emmanuel flagged that session identifiers and sequences are confusingly co-located in the UI despite serving different purposes.

**Emmanuel-style lab:** This is where the enterprise-sprawl scenario earns its keep. Each imaged app uses a different auth mechanism — Petstore uses `Authorization: Bearer`, Juice Shop uses its own token format, Grafana uses session cookies, httpbin has no auth. Trying to cover them all with the zone-wide session-identifier model is exactly the bottleneck real enterprise customers hit. Capture what the coverage gap looks like in Authentication Posture, Volumetric Abuse Detection, and Sequence Analytics (see features 9–11).

### 9. Authentication Posture

**CartNova:** Configure session identifiers. Wait 24 hours. Review endpoint auth posture. Confirm product endpoints are `cf-risk-missing-auth` (intentionally public), internal endpoints are flagged, and checkout/cart/order endpoints show authenticated traffic. Review the auth-over-time chart. Test using `cf.api_gateway.auth_id_present` in a custom rule to block unauthenticated traffic to internal endpoints.

**What to observe:** Does Authentication Posture correctly distinguish intentionally-public from accidentally-unprotected? Is the auth-over-time chart useful?

**Research connection:** Tests whether Authentication Posture provides actionable signal for a well-organised API.

**Emmanuel-style lab:** Once the imaged apps are live with fragmented auth, Authentication Posture should flag most of them as `cf-risk-missing-auth` — not because they are unauthenticated, but because the zone-wide session identifier doesn't match their auth mechanism. This false-positive behaviour is the edge case worth documenting.

### 10. Volumetric Abuse Detection

**CartNova:** Configure session identifier. Run traffic for 24+ hours with 50+ distinct sessions. Check Endpoint Management for rate-limit recommendations on `GET /api/v2/products/search` and `GET /api/v2/products`. Review p50/p90/p99 values and confidence scores. Create an Advanced Rate Limiting rule from a recommendation. Run the rate-limit abuse attack.

**What to observe:** Are recommended rate limits sensible? What confidence level? Does the rate limit catch the abuse pattern? Can you rate limit by JWT claim (for example user tier)?

**Research connection:** Tests the happy path for AI-recommended per-session rate limits.

**Emmanuel-style lab:** If session identifier coverage is incomplete (which it will be across the imaged apps), note which endpoints receive recommendations and which don't, and how confidence scores compare. Tamires: *"We can only map what the customer knows."*

### 11. Sequence Analytics

**CartNova:** Run traffic for 24+ hours. Review Sequence Analytics. Identify top sequences by correlation score. Verify the checkout flow (login, browse, cart, checkout, shipping, payment, confirm) ranks highly. Check whether sequence-violation attacks create visible anomalies.

**What to observe:** Does the checkout flow rank highly? Are correlation scores intuitive? Can you distinguish critical business flows from casual browsing? Does this naturally lead into sequence mitigation?

**Research connection:** Nuno: *"I find that sequences is the most surprising one."* Test whether analytics makes sequences less surprising and more actionable.

**Emmanuel-style lab:** Sequences only populate for endpoints that have been saved into Endpoint Management — a caveat Emmanuel explicitly flagged mid-demo. Test whether this holds across a mixed zone, and whether cross-app sequences surface when the same user moves between CartNova and an imaged app.

### 12. Sequence Mitigation

**CartNova:** Define the checkout sequence (login, browse, cart, checkout, shipping, payment, confirm). Run sequence-violation attacks (skip to confirm, skip payment). Verify enforcement blocks violations.

**What to observe:** Is sequence definition intuitive? Does it catch violations? What's the enforcement experience?

**Research connection:** Nuno: *"I find that sequences is the most surprising one."* Is it surprising or confusing?

**Emmanuel-style lab:** Not currently planned — none of the imaged apps has a natural multi-step flow worth protecting. CartNova's checkout is the right surface for this feature.

---

## Vulnerability Detection

### 13. BOLA Vulnerability Detection

**CartNova:** Run BOLA enumeration attacks (iterate through order IDs, checkout IDs). Wait for the daily risk scan. Check whether `cf-risk-bola-enumeration` or `cf-risk-bola-pollution` labels appear.

**What to observe:** Are the labels actionable? Tofarati: *"This endpoint has been tagged as being vulnerable to BOLA type attack. But what do I do with that, right?"* Check recommended actions.

**Emmanuel-style lab:** Juice Shop ships with intentional BOLA vulnerabilities out of the box. Run the same enumeration pattern against its endpoints and see whether detection surfaces the same risk labels. This is a cheap way to confirm detection isn't over-fitting to CartNova-specific traffic.

### 14. Vulnerability Scanner

**CartNova:** Prepare two credential sets via the API — Owner (User A's JWT in `Authorization` header) and Attacker (User B's JWT). Upload CartNova's OpenAPI spec as the scan input. Run a BOLA scan targeting checkout, order, and cart endpoints. Review the scan report.

**What to observe:** Does the scanner identify BOLA-vulnerable endpoints? Which endpoints show warnings? Are results actionable? How long does the scan take?

**Research connection:** Tests the full active-scanning pipeline for a well-documented API.

**Emmanuel-style lab:** The Petstore ships with its own OpenAPI spec, so it's a second ready-made scanner target. For Juice Shop, try using a learned schema (feature #4) as the scanner input. If that works, it's significant — enterprises could go from discovery through schema learning to vulnerability scanning without ever writing a spec.

### 15. Sensitive Data Detection

**CartNova:** Run traffic. Check whether detection flags PII in `/users/me`, `/checkout/{id}/shipping`, `/checkout/{id}/payment`, `/orders/{id}`. Verify `cf-risk-sensitive` labels appear.

**What to observe:** How accurate is detection? Does it catch email, phone, address? Any false positives on product data?

**Research connection:** Tamires noted detection works for US/EU patterns but lacks regional PII detection (Brazilian CPF, etc.).

**Emmanuel-style lab:** Limited value here — the imaged apps don't ship with realistic PII. Skip unless Juice Shop's seed data contains enough to be interesting.

### 16. GraphQL Query Protection

**CartNova:** Not applicable — CartNova does not use GraphQL.

**Emmanuel-style lab:** Not applicable by default, but if a GraphQL-capable container is added to the stack (the Juice Shop has a limited GraphQL surface, or a dedicated GraphQL demo container could be added), configure query depth and size limits and run attack queries. This is currently the only path to exercising GraphQL Protection in the lab, since MeridianBank's GraphQL gateway is no longer being built.

### 17. API Routing

**CartNova:** Create a route from a `/api/v3/products/{id}` source to the existing `/api/v2/products/{id}` target. Verify path variables are forwarded correctly. Test variable reordering.

**What to observe:** Is route creation intuitive? Does the route work? How long for changes to propagate (~5 min per docs)?

**Emmanuel-style lab:** Test API Routing as a consolidation mechanism — route `/api/unified/pets` and `/api/unified/orders` to Petstore endpoints, simulating the "unified external API over heterogeneous backends" pattern real enterprise customers use to apply security rules without changing backend code. This is where API Routing becomes an "escape hatch" for enterprises stuck at the discovery plateau.

### 18. Developer Portals

**CartNova:** Generate a developer portal from `cartnova-api-v2.yaml` (once written). Review the Redoc portal. Verify all 37 endpoints are documented. Deploy to Cloudflare Pages.

**What to observe:** How does the portal look? Is the documentation useful? Could this serve as actual developer docs?

**Research connection:** Tests the happy path — spec to portal.

**Emmanuel-style lab:** Export a learned schema for one of the imaged apps (Grafana or Juice Shop) and generate a portal from it. This tests what auto-generated documentation looks like for APIs that were never intentionally documented — the scenario most enterprise customers face.

---

## Cross-Cutting

### 19. Log Mode to Enforcement Transition

**CartNova:** Configure schema validation in log mode. Run traffic for 1 hour. Review logged violations in Security Events. Switch to enforcement. Verify blocking works. Repeat for JWT validation and sequence mitigation.

**What to observe:** What does the log mode dashboard show? Is the data actionable? What does the enforcement switch feel like? How many features reach full enforcement?

**Research connection:** The log-to-enforcement transition is where value becomes concrete. If CartNova can't get here, no one can.

**Emmanuel-style lab:** Track how many features reach enforcement against the imaged apps vs. stay in log mode. This is the "log mode trap" — customers stay in log mode indefinitely because they never build enough confidence to enforce. Document which features enforce cleanly and which stall.

---

## Quick Reference: Feature Coverage

| # | Feature | CartNova | Emmanuel-style lab (planned) | Docs Reference |
|---|---------|----------|------------------------------|----------------|
| 1 | API Discovery | Primary test | Sprawl test | [Link](https://developers.cloudflare.com/api-shield/security/api-discovery/) |
| 2 | Endpoint Management | Primary test | Sprawl test | [Link](https://developers.cloudflare.com/api-shield/management-and-monitoring/endpoint-management/) |
| 3 | Endpoint Labeling | Primary test | Per-app partition test | [Link](https://developers.cloudflare.com/api-shield/management-and-monitoring/endpoint-labels/) |
| 4 | Schema Learning | Validation vs. ground truth | Learned-schema-only test | [Link](https://developers.cloudflare.com/api-shield/management-and-monitoring/endpoint-management/schema-learning/) |
| 5 | Schema Validation | Primary test | Petstore spec + learned-schema input | [Link](https://developers.cloudflare.com/api-shield/security/schema-validation/) |
| 6 | JWT Validation | Primary test | Petstore demo (Emmanuel's flagship) | [Link](https://developers.cloudflare.com/api-shield/security/jwt-validation/) |
| 7 | Mutual TLS | Primary test | Not planned | [Link](https://developers.cloudflare.com/api-shield/security/mtls/) |
| 8 | Session Identifiers | Primary test | Fragmented-auth test | [Link](https://developers.cloudflare.com/api-shield/management-and-monitoring/session-identifiers/) |
| 9 | Authentication Posture | Primary test | False-positive behaviour under fragmented auth | [Link](https://developers.cloudflare.com/api-shield/security/authentication-posture/) |
| 10 | Volumetric Abuse Detection | Primary test | Partial-coverage test | [Link](https://developers.cloudflare.com/api-shield/security/volumetric-abuse-detection/) |
| 11 | Sequence Analytics | Primary test | Cross-app sequence test | [Link](https://developers.cloudflare.com/api-shield/security/sequence-analytics/) |
| 12 | Sequence Mitigation | Primary test | Not planned | [Link](https://developers.cloudflare.com/api-shield/security/sequence-mitigation/) |
| 13 | BOLA Detection | Primary test | Juice Shop sanity check | [Link](https://developers.cloudflare.com/api-shield/security/bola-vulnerability-detection/) |
| 14 | Vulnerability Scanner | Primary test | Petstore + learned-schema input | [Link](https://developers.cloudflare.com/api-shield/security/vulnerability-scanner/) |
| 15 | Sensitive Data Detection | Primary test | Skip unless seed data is interesting | [Link](https://developers.cloudflare.com/api-shield/management-and-monitoring/endpoint-management/#sensitive-data-detection) |
| 16 | GraphQL Protection | Not applicable | Only if a GraphQL container is added | [Link](https://developers.cloudflare.com/api-shield/security/graphql-protection/) |
| 17 | API Routing | Secondary test | Primary test (unified-facade pattern) | [Link](https://developers.cloudflare.com/api-shield/management-and-monitoring/api-routing/) |
| 18 | Developer Portals | Primary test | Auto-generated docs from learned schema | [Link](https://developers.cloudflare.com/api-shield/management-and-monitoring/developer-portal/) |
| 19 | Log to Enforcement | Primary test | "Log mode trap" test | [Link](https://developers.cloudflare.com/api-shield/get-started/) |
