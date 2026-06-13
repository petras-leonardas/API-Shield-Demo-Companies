# API Shield Lab -- Project Plan

## Overview

This document tracks the implementation plan for the API Shield demo lab. The goal is to get realistic API traffic flowing through Cloudflare so every API Shield feature documented at [developers.cloudflare.com/api-shield](https://developers.cloudflare.com/api-shield/) can be tested end-to-end. See `feature-test-map.md` for the feature-to-scenario mapping.

> **Historical note.** An earlier version of this plan called for a second fictitious company (MeridianBank) to represent the enterprise-sprawl scenario. That approach has been abandoned. The enterprise scenario will instead be reproduced by standing up an Emmanuel-style lab -- a stack of off-the-shelf Docker images exposed via a `cloudflared` tunnel as additional subdomains on the same Cloudflare zone. See `AGENTS.md` → *Approach* and `Emmanuel's setup/` for the reference implementation.

---

## Tech Stack (actual)

| Component | Technology | Notes |
|-----------|------------|-------|
| Mock API (CartNova) | TypeScript + Hono on Cloudflare Workers | Originally planned as Node.js + Express; switched to Workers for simpler deployment. |
| Frontend (CartNova) | Vanilla HTML/CSS/JS + Tailwind CDN | Served by the same Worker via Workers static assets. |
| Traffic generation (CartNova) | TypeScript Cloudflare Worker + GitHub Actions | Cron Worker dispatches a GitHub Actions workflow that makes requests from outside Cloudflare (so traffic counts towards API Shield analytics). |
| JWT generation | `jsonwebtoken` inside the traffic Worker | Valid, expired, and malformed tokens. |
| OpenAPI spec (CartNova) | YAML | Not yet written. Needed for schema validation, vulnerability scanner, and dev portal. |
| mTLS certificates (CartNova webhooks) | Self-signed CA + client certs | Not yet generated. |
| Enterprise sprawl scenario | Off-the-shelf Docker images via `cloudflared` tunnel | Not yet built. See Phase 3 below. |

---

## Implementation Phases

### Phase 1: CartNova Mock API and Frontend -- DONE

CartNova is fully operational on `carnova.uk`.

- 37 endpoints across 8 route groups implemented in Hono + TypeScript (`cartnova/api/`).
- 9-page vanilla-JS frontend served from the same Worker (`cartnova/api/public/`).
- Seed data for 3 users, 12 products, 4 orders, and 3 sellers.
- Intentional vulnerabilities baked in: BOLA on order lookup and checkout status, exposed internal endpoints, JWT secret in source.

### Phase 2: CartNova Traffic Generator -- DONE

- Separate Cloudflare Worker (`cartnova-traffic`) with a cron trigger every 2 hours.
- Dispatches a GitHub Actions workflow that runs journey scripts from outside Cloudflare.
- Tuned to ~15-20K requests/day (20% of the free Workers plan's 100K/day limit).
- Six job types -- `core`, `attacks`, `expanded`, `graphql`, `errors-bots`, `special` -- on a UTC rotation schedule.
- Kill switch (`TRAFFIC_ENABLED` in `cartnova/traffic/src/config.ts`) to pause all traffic.

### Phase 3: Emmanuel-style enterprise-sprawl lab -- NOT STARTED

Replaces the abandoned MeridianBank company. The goal is to reproduce the "many apps, fragmented auth, single zone" conditions that real enterprise customers see, using Docker images pulled from public registries instead of a bespoke second app.

**Tasks:**

1. Decide on infrastructure host -- laptop + Docker, small always-on cloud VM (~$5/month), or Cloudflare Containers. Leaning towards a cloud VM for realism and 24/7 availability.
2. Install `cloudflared` on the chosen host and register a tunnel against the CartNova Cloudflare account (or a separate lab zone -- decision pending).
3. Bring up the core app stack as Docker containers:
   - **Swagger Petstore** -- comes with an OpenAPI spec, so API Shield schema validation works out of the box.
   - **OWASP Juice Shop** -- a second e-commerce surface with intentional vulnerabilities.
   - **Grafana** (and/or Kibana) -- a realistic internal observability tool to populate Discovery with non-business traffic.
   - **httpbin** -- a small, status-code-driven app for rate-limit demos.
4. Publish each container as a subdomain on the chosen zone (for example `petstore.carnova.uk`, `juice.carnova.uk`).
5. Replicate Emmanuel's JWT-validation demo against the Petstore: sensitive endpoint blocked by default, Python script generates a JWT, request succeeds. See `Emmanuel's setup/wiki-02-securing-apis-with-jwt-validation.md` and `wiki-03-implementing-jwt-validation-for-petstore-swagger-api.md` for the scripts.
6. Decide whether to extend the CartNova traffic generator to drive these apps too, or keep it focused on CartNova and add a smaller separate trickle for the imaged apps.

### Phase 4: Cloudflare API Shield configuration -- IN PROGRESS

With CartNova live and the Emmanuel-style lab planned, configure API Shield itself against the running traffic.

**Tasks:**

1. Configure session identifiers for CartNova (`Authorization` header for buyers, `X-Seller-Key` for sellers).
2. Upload the CartNova OpenAPI spec to Schema Validation once it exists. Start in log mode.
3. Configure JWT validation rules for CartNova's authenticated endpoints.
4. Upload mTLS client CA certificates for the CartNova webhook endpoints once certificates exist.
5. Once the Emmanuel-style lab is live: add session identifiers matching each imaged app's auth mechanism, upload the Petstore OpenAPI spec, and configure JWT validation for the Petstore.
6. Review Authentication Posture and Volumetric Abuse Detection recommendations once the new apps have ~24 hours of traffic.
7. Configure sequence mitigation on the CartNova checkout flow (start → shipping → payment → confirm).
8. Document the Cloudflare configuration for reproducibility.

### Phase 5: Testing and documentation -- IN PROGRESS

Walk each API Shield feature against the live lab and document the experience.

**Tasks:**

1. Work through `feature-test-map.md` feature by feature, documenting what worked, what didn't, and where the UX broke down.
2. Run CartNova's Vulnerability Scanner BOLA scan once the OpenAPI spec exists and document findings.
3. Generate a Developer Portal from the CartNova spec and evaluate the output.
4. Repeat scanner and dev-portal flows against the Petstore once the Emmanuel-style lab is up -- useful as a "spec I did not write" contrast.
5. Capture observations as Deep Dives in `Deep Dives/`. Each deep dive should trace back to a research finding or a live testing result.

---

## Traffic Budget

The project runs on the free Workers plan (100K requests/day on `carnova.uk`). The traffic generator is tuned to ~20% of that ceiling, leaving room for:

- Manual testing and the Cloudflare dashboard.
- Frontend browsing during demos.
- The planned Emmanuel-style lab subdomains (if traffic is extended to them).
- Unexpected bursts.

See `AGENTS.md` → *Traffic Budget* for the detailed tuning.

---

## Shared Utilities

### JWT generator

Lives inside the CartNova traffic Worker. Generates valid, expired, and malformed tokens for testing.

### Traffic Logger

GitHub Actions workflow logs every journey run. Logs can be compared with API Shield Discovery output to verify completeness.

---

## Success Criteria

### CartNova (happy path)

- [ ] All 37 endpoints discovered by API Shield.
- [ ] All endpoints saved and organised in Endpoint Management.
- [ ] Managed labels applied (`cf-log-in`, `cf-sign-up`, `cf-add-cart`, `cf-purchase`, `cf-add-payment`, `cf-add-post`).
- [ ] Schema learning output compared against authoritative OpenAPI spec.
- [ ] OpenAPI schema uploaded and schema validation active (log, then enforce).
- [ ] JWT validation rules active and tested with valid, expired, tampered, and wrong-issuer tokens.
- [ ] mTLS configured for webhook endpoints.
- [ ] Session identifiers configured (`Authorization`, `X-Seller-Key`).
- [ ] Authentication Posture reviewed (public endpoints flagged, internal endpoints flagged).
- [ ] Volumetric Abuse Detection rate-limit recommendations appear and are applied.
- [ ] Checkout sequence visible in Sequence Analytics with a high correlation score.
- [ ] Checkout sequence mitigation rules defined and enforced.
- [ ] BOLA detection risk labels appear on the vulnerable order endpoints.
- [ ] Vulnerability Scanner BOLA scan completed with actionable results.
- [ ] Sensitive data detected in user/checkout/order endpoints (`cf-risk-sensitive` labels).
- [ ] Developer Portal generated from the OpenAPI spec and deployed.
- [ ] Nuno's benchmark hit: 80% of discovered endpoints saved, 10% with active rules.
- [ ] Full journey from discovery to enforcement completed across every applicable feature.

### Emmanuel-style lab (enterprise-sprawl stand-in)

- [ ] Lab host provisioned and `cloudflared` tunnel registered.
- [ ] Petstore, Juice Shop, Grafana, and httpbin live on lab subdomains.
- [ ] Each app receives discoverable traffic.
- [ ] Multiple session identifiers configured across the different apps' auth mechanisms.
- [ ] Petstore JWT-validation demo reproduced end-to-end (sensitive endpoint → block → generate JWT → unblock).
- [ ] Observations on how API Shield behaves under "mixed apps under one zone" conditions captured as a Deep Dive.
