# API Shield Lab -- Project Plan

## Overview

This document outlines the implementation plan for building and deploying both demo companies. The goal is to get realistic API traffic flowing through Cloudflare so all 19 API Shield features documented at [developers.cloudflare.com/api-shield](https://developers.cloudflare.com/api-shield/) can be tested. See `feature-test-map.md` for the complete feature-to-scenario mapping.

---

## Tech Stack

| Component | Technology | Why |
|-----------|------------|-----|
| Mock API servers | Node.js + Express | Simple, transparent route definitions. Easy to read and modify. |
| GraphQL endpoint | `express-graphql` or `apollo-server-express` | For MeridianBank's GraphQL gateway. |
| Traffic generation | Node.js scripts with `fetch()` | Same language as the servers. Configurable journey orchestration. |
| Endpoint sprawl generator | Node.js script | Reads config, dynamically registers Express routes. |
| OpenAPI specs | YAML files | For CartNova schema validation upload and Vulnerability Scanner input. |
| JWT generation | `jsonwebtoken` npm package | Generate valid/invalid/expired test tokens. |
| mTLS certificates | Self-signed CA + client certs | For CartNova webhooks and MeridianBank partner APIs. |
| Deployment | Any server behind Cloudflare proxy | Traffic must route through Cloudflare for discovery to work. |

---

## Implementation Phases

### Phase 1: CartNova Mock APIs

Build the CartNova Express server with all 37 endpoints.

**Tasks:**
1. Initialize Node.js project in `cartnova/api/`
2. Create route files for each endpoint group (products, cart, checkout, users, sellers, orders, webhooks, internal)
3. Implement JWT auth middleware (validate Bearer tokens)
4. Implement API key auth middleware (validate `X-Seller-Key`)
5. Create seed data (products, users, categories) -- must include at least 2 distinct user accounts with separate data for Vulnerability Scanner BOLA testing
6. Each endpoint returns realistic JSON responses with appropriate PII/sensitive data
7. Write the OpenAPI spec (`cartnova-api-v2.yaml`) -- this serves triple duty: Schema Validation upload, Vulnerability Scanner input, and Developer Portal generation
8. Generate self-signed CA and client certificates for mTLS webhook testing

**Endpoints to implement:** 37
**Estimated complexity:** Low -- straightforward CRUD-like responses

### Phase 2: MeridianBank Mock APIs (Core)

Build the MeridianBank Express server with the ~40 core endpoints across 7 architectural styles.

**Tasks:**
1. Initialize Node.js project in `meridianbank/api/`
2. Create route files for each service group (mobile-banking, legacy-portal, partners, internal-services, wealth-management, card-services, graphql-gateway, deprecated)
3. Implement multiple auth middlewares (JWT, API key, Basic Auth, none)
4. Implement GraphQL gateway using `express-graphql` or `apollo-server-express` with schema for accounts, transactions, and transfers
5. Enable GraphQL introspection and Playground on GET (intentional security misconfiguration)
6. Each service group should use its own naming convention and response format
7. Create seed data (accounts, customers, portfolios, cards)
8. Internal/debug endpoints must return realistically sensitive data (risk scores, DB strings)

**Endpoints to implement:** ~40
**Estimated complexity:** Medium-High -- multiple auth patterns, response formats, and a GraphQL schema

### Phase 3: MeridianBank Sprawl Generator

Build the generator that creates 70-100 additional endpoints.

**Tasks:**
1. Create generator script in `meridianbank/generator/`
2. Implement each sprawl category (path variants, version ghosts, microservice leaks, etc.)
3. Generator reads config and dynamically registers Express routes
4. Test that generated endpoints return plausible responses
5. Tune the total count and distribution

**Endpoints to generate:** 70-100 (configurable)
**Estimated complexity:** Medium -- needs to feel organic, not pattern-generated

### Phase 4: Traffic Generation Scripts

Build the journey scripts for both companies.

**Tasks:**
1. Create shared utilities (`jwt-generator.js`, `traffic-logger.js`)
2. CartNova: Implement 6 journeys (checkout, browsing, seller, webhooks, vulnerability scanner setup, attacks)
3. MeridianBank: Implement 7 journeys (modern banking, legacy portal, partners, internal leaks, shadow, wealth management, GraphQL gateway) + attacks (including GraphQL depth/size/introspection attacks)
4. Build journey runner/orchestrator with configurable concurrency and intervals
5. Add logging so sent traffic can be compared with what discovery finds
6. Implement GraphQL-specific traffic: normal queries, nested queries, mutations, and attack queries

### Phase 5: Cloudflare Configuration

Set up the Cloudflare test account and configure DNS/proxy.

**Tasks:**
1. Create Cloudflare test account (or zone on existing account) with API Shield enabled
2. Configure DNS records pointing to the deployed servers
3. Ensure all traffic is proxied through Cloudflare (orange cloud)
4. Verify API Shield discovery starts picking up traffic
5. Configure session identifiers for both companies
6. Upload mTLS client CA certificates for CartNova webhooks and MeridianBank partner APIs
7. Set up Vulnerability Scanner target environment and credential sets for CartNova
8. Document the Cloudflare configuration for reproducibility

### Phase 6: Testing and Documentation

Run through both companies and document the experience across all 19 API Shield features.

**Tasks:**
1. Run CartNova traffic for 24+ hours (needed for schema learning, volumetric abuse detection, authentication posture, and sequence analytics)
2. Run MeridianBank traffic for 24+ hours with all 7 journeys active
3. Walk through all 19 features in the feature test map (`feature-test-map.md`), documenting: what worked, what didn't, where the UX broke down
4. Run the CartNova Vulnerability Scanner BOLA scan and document findings
5. Test GraphQL Query Protection on MeridianBank's GraphQL gateway
6. Generate Developer Portals for both companies and evaluate the output
7. Test API Routing on MeridianBank as a consolidation mechanism
8. Compare experience against research findings -- do the real interviews match the firsthand experience?

---

## Deployment Options

The mock API servers need to be accessible via the public internet through Cloudflare. Options:

| Option | Pros | Cons |
|--------|------|------|
| **Cloudflare Workers** | No server to manage. Free tier available. Ironic but practical. | May need adaptation from Express to Workers format. |
| **VPS (e.g., DigitalOcean, Hetzner)** | Full control. Run Express directly. | Costs money. Needs basic server management. |
| **Cloudflare Tunnel** | Run locally, expose through Cloudflare. No public server needed. | Slightly more setup. Depends on local machine being on. |
| **Railway / Render / Fly.io** | Quick deploy from Git. Free tiers available. | Less control. May have cold start delays. |

**Recommended:** Cloudflare Tunnel for development/testing (run locally, no server costs). Move to a VPS or Workers for sustained traffic generation.

---

## Shared Utilities

### JWT Generator (`shared/utils/jwt-generator.js`)

Generates test JWT tokens for both companies:
- Valid tokens (correct signature, not expired, correct issuer)
- Expired tokens (for JWT validation testing)
- Wrong-issuer tokens
- Tampered tokens (modified payload, original signature)
- Tokens for different users (for BOLA testing)

### Traffic Logger (`shared/utils/traffic-logger.js`)

Logs all traffic sent by the journey scripts:
- Timestamp, method, path, status code, response time
- Can be compared with API Shield discovery output to verify completeness
- Exportable as CSV for analysis

---

## Success Criteria

### CartNova (Happy Path -- 19 features)
- [ ] All 37 endpoints discovered by API Shield
- [ ] All endpoints saved and organized in Endpoint Management
- [ ] Managed labels applied (cf-log-in, cf-sign-up, cf-add-cart, cf-purchase, cf-add-payment, cf-add-post)
- [ ] Schema learning output compared against authoritative OpenAPI spec
- [ ] OpenAPI schema uploaded and schema validation active (log then enforce)
- [ ] JWT validation rules active and tested (valid, expired, tampered, wrong-issuer tokens)
- [ ] mTLS configured for webhook endpoints
- [ ] Session identifier configured (Authorization header)
- [ ] Authentication Posture reviewed (public endpoints flagged, internal endpoints flagged)
- [ ] Volumetric Abuse Detection rate limit recommendations appear and are applied
- [ ] Checkout sequence visible in Sequence Analytics with high correlation score
- [ ] Checkout sequence mitigation rules defined and enforced
- [ ] BOLA detection risk labels appear on vulnerable endpoints
- [ ] Vulnerability Scanner BOLA scan completed with actionable results
- [ ] Sensitive data detected in user/checkout endpoints (cf-risk-sensitive labels)
- [ ] Developer Portal generated from OpenAPI spec and deployed
- [ ] API Routing tested (v3 to v2 route)
- [ ] Full journey from discovery to enforcement completed across all applicable features

### MeridianBank (Failure Path -- 19 features)
- [ ] 150+ endpoints visible in discovery (including GraphQL)
- [ ] Discovery output feels overwhelming and unactionable
- [ ] Path variable variants clutter the list
- [ ] Multiple API styles (REST, SOAP, GraphQL) interleaved with no grouping
- [ ] Endpoint labeling attempted -- document whether it helps tame the sprawl
- [ ] Schema learning produces usable output for mobile banking endpoints
- [ ] Learned schema imported to schema validation (assess confidence)
- [ ] JWT validation configured for /api/v3/ only (coverage gap documented)
- [ ] mTLS configured for partner endpoints
- [ ] Session identifier configuration blocked by auth fragmentation
- [ ] Authentication Posture shows widespread cf-risk-missing-auth (internal + legacy endpoints)
- [ ] Volumetric Abuse Detection recommendations spotty due to fragmented sessions
- [ ] Sequence Analytics surfaces modern transfer flow (legacy flow status documented)
- [ ] Sequence mitigation on modern flow only (legacy flow unprotected -- documented)
- [ ] BOLA detection flags on account/internal endpoints
- [ ] Learned schema tested as Vulnerability Scanner input (if viable)
- [ ] Sensitive data (SSN, card numbers, DB strings) detected on unauthenticated endpoints
- [ ] GraphQL Query Protection configured and tested (depth/size limits, introspection)
- [ ] API Routing tested as consolidation mechanism
- [ ] Developer Portal generated from learned schema (evaluate quality)
- [ ] Internal/debug endpoints appear alongside public APIs
- [ ] Document exactly where and why progress stalls for each feature
