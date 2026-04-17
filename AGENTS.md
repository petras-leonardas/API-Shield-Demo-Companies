# API Shield Demo Companies

## Project Overview

This is a lab environment for testing Cloudflare's API Shield product using two fictitious companies. The project owner is Leo, a product designer on the Application Security team at Cloudflare.

The goal is to create realistic mock API traffic through Cloudflare so that every API Shield feature can be tested firsthand -- from endpoint discovery through enforcement. This directly supports UX research into why customers struggle to adopt API Shield (documented in the sibling project `API-security-discovery-interviews/`).

## Why Two Companies

Research from 8 internal interviews revealed a sharp divide between two types of API Shield customers:

- **Digital-native companies** self-serve successfully. They know their APIs, have schemas, and configure security on day one.
- **Enterprise companies** stall after discovery. They have sprawling, undocumented API surfaces and can't progress past the "now what?" moment.

This project recreates both scenarios so Leo can walk the full API Shield journey from each perspective.

## The Two Companies

### CartNova -- Digital Native E-Commerce Marketplace

A modern, 4-year-old multi-category e-commerce marketplace. API-first, clean architecture, 37 well-documented endpoints. Represents the **Self-Sufficient Adopter** persona.

- **Live domain:** `carnova.uk` (Cloudflare enterprise plan)
- **Status:** API fully implemented, frontend live, automated traffic running
- **Purpose:** Test the happy path. Can a well-organized customer complete the full API Shield journey end-to-end?
- **Key test:** Walk from discovery through schema validation, JWT rules, sequence mitigation on the checkout flow, and enforcement.
- **Success metric:** Achieve Nuno's benchmark -- 80% of discovered endpoints saved, 10% with active rules.

### MeridianBank -- Enterprise Financial Services

A mid-size bank that's been digitizing for 12 years. Chaotic API surface, 100-150+ endpoints across 6 different architectural eras, no central governance. Represents the **Discovery Plateauer** persona.

- **Status:** Planning docs complete, implementation not started
- **Purpose:** Experience the failure path. What does the discovery plateau feel like with 150+ messy endpoints?
- **Key test:** Run discovery, see the wall of endpoints, and try to make progress. Identify exactly where and why you stall.
- **Success metric:** There isn't one -- that's the point. Document where the experience breaks down.

## Current State -- What's Built

### CartNova (Fully Operational)

**API Server** (`cartnova/api/`) -- Cloudflare Worker using Hono + TypeScript. 37 endpoints across 8 route groups. Deployed to `carnova.uk`.

**Frontend** (`cartnova/api/public/`) -- Vanilla HTML/CSS/JS e-commerce site served from the same Worker via Cloudflare Workers static assets. 9 pages covering all user-facing endpoints. Each page shows an "API Endpoints" annotation panel mapping UI actions to the API calls they trigger.

**Traffic Generator** (`cartnova/traffic/`) -- Separate Cloudflare Worker with a Cron trigger (`* * * * *`). Simulates 20-25 concurrent users per minute across 4 journey types (checkout, browsing, user activity, seller). Generates ~9,000-14,000 requests/hour with human-like pacing and staggered arrivals. Deployed as `cartnova-traffic`.

**Intentional vulnerabilities** baked into the API for testing:
- BOLA on `GET /orders/:order_id` and `GET /orders/:order_id/tracking` (no ownership check)
- BOLA on `GET /checkout/:checkout_id/status` (no ownership check)
- Internal endpoints (`/internal/health`, `/internal/metrics`, `/internal/cache/invalidate`) exposed with zero auth
- JWT secret in source code (intentional -- traffic generator needs it to create tokens)

### MeridianBank (Planning Only)

Planning docs are complete (company profile, API architecture, traffic plan, sprawl design). No code has been implemented.

## Project Structure

```
API-Shield-Demo-Companies/
  AGENTS.md                              # This file
  cartnova-frontend-plan.md              # Detailed frontend implementation plan
  cartnova/
    company-profile.md                   # Business model, team, why API Shield
    api-architecture.md                  # Full endpoint inventory, auth model, data flows
    traffic-plan.md                      # Scripted user journeys and attack patterns
    api/                                 # Hono + TypeScript API on Cloudflare Workers
      wrangler.toml                      #   Worker config (includes [assets] for frontend)
      src/
        index.ts                         #   Main entry point, route mounting
        data/types.ts                    #   TypeScript interfaces (16 types)
        data/seed.ts                     #   Full seed data (3 users, 12 products, 4 orders, 3 sellers)
        middleware/jwt.ts                #   JWT Bearer auth middleware
        middleware/apikey.ts             #   X-Seller-Key auth middleware
        routes/products.ts               #   6 endpoints (public)
        routes/categories.ts             #   2 endpoints (public)
        routes/cart.ts                   #   4 endpoints (JWT auth)
        routes/checkout.ts               #   5 endpoints (JWT auth, sequence flow)
        routes/users.ts                  #   6 endpoints (mixed auth)
        routes/orders.ts                 #   4 endpoints (JWT auth, BOLA vuln)
        routes/sellers.ts                #   5 endpoints (API key auth)
        routes/webhooks.ts               #   2 endpoints (mTLS at CF level)
        routes/internal.ts               #   3 endpoints (no auth -- intentionally exposed)
      public/                            # Static frontend (served via Workers assets)
        index.html                       #   Home -- product grid, search, categories
        product.html                     #   Product detail -- info, reviews, variants
        category.html                    #   Category product listing
        login.html                       #   Login + register (test accounts listed)
        cart.html                        #   Shopping cart management
        checkout.html                    #   Multi-step checkout (sequence mitigation flow)
        account.html                     #   User profile, saved addresses
        orders.html                      #   Order history, detail, tracking, returns
        seller.html                      #   Seller dashboard (API key auth)
        css/styles.css                   #   Custom styles on top of Tailwind CDN
        js/api.js                        #   Shared API client (auto-attaches JWT/API key)
        js/auth.js                       #   JWT token + seller key management
        js/nav.js                        #   Shared navigation header
        js/{page}.js                     #   Per-page logic (home, product, cart, etc.)
    specs/                               # (empty) OpenAPI specs for schema validation
    traffic/                             # Automated traffic generator (Cloudflare Worker)
      wrangler.toml                      #   Cron trigger: * * * * *
      src/
        index.ts                         #   Cron handler + orchestrator
        config.ts                        #   Users, products, sellers, addresses, search terms
        http.ts                          #   Fetch wrapper with logging + human delay helpers
        journeys/checkout.ts             #   Happy path checkout (11-14 endpoints per run)
        journeys/browsing.ts             #   Guest browsing (3 patterns: search, category, catalog)
        journeys/seller.ts               #   Seller dashboard activity (API key auth)
        journeys/user-activity.ts        #   Account management, orders, reviews, returns
  meridianbank/
    company-profile.md                   # Business model, history, organizational dysfunction
    api-architecture.md                  # Full endpoint inventory, auth mess, shadow APIs
    traffic-plan.md                      # Scripted journeys and attack patterns
    sprawl-design.md                     # How the endpoint generator creates organic mess
    api/                                 # (not started)
    generator/                           # (not started)
    traffic/                             # (not started)
  shared/
    feature-test-map.md                  # API Shield features mapped to test scenarios
    project-plan.md                      # Original implementation plan (6 phases)
```

## Deployed Services

| Service | Worker Name | Domain / URL | Cron |
|---------|-------------|--------------|------|
| CartNova API + Frontend | `cartnova-api` | `carnova.uk` | -- |
| CartNova Traffic Generator | `cartnova-traffic` | `cartnova-traffic.petras-leonardas.workers.dev` | `* * * * *` |

Cloudflare account ID: `0644b2da0e70bd12883572fd98db4874`

## Traffic Kill Switch

The traffic generator has a kill switch to pause/resume all automated traffic. This exists because the personal Cloudflare account ("Leo Designs the World") is on the free Workers plan with a 100,000 requests/day limit, and the traffic generator can produce 100K+ requests/day.

**Current state: ACTIVE (TRAFFIC_ENABLED = true)**

**The switch:** A single constant `TRAFFIC_ENABLED` in `cartnova/traffic/src/config.ts` (line 7).

**To pause traffic (stop all requests):**
1. Set `TRAFFIC_ENABLED = false` in `cartnova/traffic/src/config.ts`
2. Push to `main` (so GitHub Actions CI runner picks up the change)
3. Redeploy the traffic Worker: `npx wrangler deploy` from `cartnova/traffic/`

**To resume traffic (re-enable all requests):**
1. Set `TRAFFIC_ENABLED = true` in `cartnova/traffic/src/config.ts`
2. Push to `main`
3. Redeploy the traffic Worker: `npx wrangler deploy` from `cartnova/traffic/`

**How it works:** The switch is checked in two places:
- `cartnova/traffic/src/index.ts` -- the Worker cron handler exits early without triggering GitHub Actions
- `cartnova/traffic/src/ci-runner.ts` -- the GitHub Actions entry point exits immediately if a run somehow starts

**When the user says "turn on traffic" or "resume traffic":** Change `TRAFFIC_ENABLED` to `true`, push, and redeploy. When they say "turn off traffic" or "pause traffic": change to `false`, push, and redeploy.

## Key Credentials for Testing

**Buyer accounts** (any password works on the mock API):
- `emma.johnson@example.com` (user_a8k2m1nz) -- 2 orders, Amsterdam
- `lucas.chen@example.com` (user_p3x7q9wt) -- 1 order, Berlin
- `sofia.martinez@example.com` (user_r5j4h6yb) -- 1 order, Barcelona

**Seller API keys** (passed via `X-Seller-Key` header):
- TechVault: `sk_tv_live_a1b2c3d4e5f6`
- NordicWear: `sk_nw_live_g7h8i9j0k1l2`
- HomeEssence: `sk_he_live_m3n4o5p6q7r8`

**JWT config:** secret `cartnova-jwt-secret-2024`, issuer `cartnova-auth`, 15-minute expiry.

## CartNova Endpoint Inventory (37 total)

| Group | Endpoints | Auth | Notes |
|-------|-----------|------|-------|
| Products | 6 (list, search, detail, reviews, post review, variants) | Public (POST review = JWT) | |
| Categories | 2 (list, category products) | Public | |
| Cart | 4 (view, add, update qty, remove) | JWT | |
| Checkout | 5 (start, shipping, payment, confirm, status) | JWT | Sequence flow for mitigation testing. BOLA on status. |
| Users/Auth | 6 (register, login, refresh, profile, update, addresses) | Mixed | Login issues real JWTs. |
| Orders | 4 (list, detail, tracking, return) | JWT | BOLA on detail + tracking. |
| Sellers | 5 (list, create, update, analytics, orders) | API Key | |
| Webhooks | 2 (payment, shipping) | mTLS (CF level) | Not yet testable -- mTLS certs not set up. |
| Internal | 3 (health, metrics, cache invalidate) | None | Intentionally exposed shadow API. |

## CartNova Frontend Pages

| Page | URL | Key Endpoints |
|------|-----|---------------|
| Home | `carnova.uk` | GET /products, GET /categories, GET /products/search |
| Product Detail | /product.html?id=... | GET /products/:id, reviews, variants, POST /cart/items |
| Category | /category.html?id=... | GET /categories/:id/products |
| Login | /login.html | POST /auth/login, POST /auth/register |
| Cart | /cart.html | GET /cart, PUT/DELETE /cart/items/:id, POST /checkout/start |
| Checkout | /checkout.html?id=... | PUT shipping, PUT payment, POST confirm, GET status |
| Account | /account.html | GET/PUT /users/me, GET /users/me/addresses |
| Orders | /orders.html | GET /orders, GET detail, GET tracking, POST return |
| Seller Portal | /seller.html | All 5 /sellers/me/* endpoints |

## Traffic Generator Details

The `cartnova-traffic` Worker runs every minute and simulates realistic e-commerce activity:

| Journey | Users/batch | Endpoints covered | Stagger |
|---------|-------------|-------------------|---------|
| Checkout | 6-8 | 14 (login through order confirmation) | 0-20s |
| Browsing | 10-12 | 6 (search, categories, products, reviews) | 0-15s |
| User Activity | 3-4 | 10 (profile, orders, tracking, reviews) | 0-25s |
| Seller | 1-2 | 5 (listings, analytics, orders) | 0-30s |
| Monitoring | 1 | 2 (internal health + metrics) | 0-10s |

Covers 35 of 37 endpoints (webhooks excluded -- need mTLS). Human-like delays (200-1500ms) between requests within each journey. Manual trigger: `POST https://cartnova-traffic.petras-leonardas.workers.dev/run`.

## How Sessions in This Project Typically Work

- **Building mock APIs**: Implementing Workers, routes, middleware, and seed data for each company
- **Building frontends**: Creating UI pages that map visually to API endpoint groups
- **Building traffic generators**: Creating automated journey scripts that simulate real user patterns
- **Refining company definitions**: Adjusting endpoints, auth patterns, or data as testing reveals gaps
- **Deployment and configuration**: Setting up Cloudflare DNS, proxy, Workers, and API Shield configuration
- **Testing API Shield features**: Running through discovery, schema validation, JWT rules, sequence mitigation, and enforcement using the live traffic and frontend
- **Documenting findings**: Recording what happened when testing each API Shield feature

## What's Left to Build

### CartNova (remaining work)
- **OpenAPI spec** (`specs/` is empty) -- needed for schema validation, vulnerability scanner, dev portal
- **mTLS certificates** -- needed for webhook endpoint testing
- **Attack traffic patterns** -- scripted sequences for rate limiting, BOLA enumeration, JWT attacks, sequence violations (defined in traffic-plan.md but not yet implemented)
- **Cloudflare API Shield configuration** -- endpoint management, session identifiers, JWT rules, sequence rules, rate limiting

### MeridianBank (not started)
- Everything -- API server, endpoint sprawl generator, traffic scripts, deployment

## Research Connection

This project is grounded in findings from the `API-security-discovery-interviews/` project. Key findings that shaped these demo companies:

- No participant (0 of 8) has seen a customer complete the full API Shield onboarding journey
- The "discovery plateau" is the most common failure mode (hence MeridianBank)
- Digital-native companies self-serve successfully (hence CartNova)
- Session identifiers are a critical bottleneck
- JWT validation is the most valued but least-known feature
- The checkout/payment flow is the most natural sequence mitigation test case

## Tech Stack

- **Mock APIs:** TypeScript with Hono framework on Cloudflare Workers (originally planned as Node.js/Express, switched to Workers for simpler deployment)
- **Frontend:** Vanilla HTML/CSS/JS with Tailwind CDN, served via Cloudflare Workers static assets
- **Traffic Generation:** TypeScript Cloudflare Workers with Cron triggers
- **Endpoint Sprawl (MeridianBank):** Generator script that creates 70-100+ additional endpoints with varied naming, auth, and versioning patterns (not yet built)
- **OpenAPI Specs (CartNova):** YAML specs for upload to API Shield schema validation (not yet written)

## Rules

- **Keep companies distinct.** CartNova should feel clean and intentional. MeridianBank should feel messy and organic. Don't accidentally make MeridianBank too consistent.
- **Realistic over clever.** The APIs don't need complex business logic. They need realistic URL patterns, auth mechanisms, response shapes, and traffic patterns.
- **Trace to research.** Design decisions should map back to research findings. If a design choice doesn't connect to a real customer pattern, question whether it's needed.
- **Frontend-API consistency.** When modifying API response shapes, audit the frontend JS files that consume them. The frontend was built after the API, and mismatches between response keys and JS property access have occurred before (e.g., `results` vs `products`, `author_name` vs `author`). Always cross-reference.
