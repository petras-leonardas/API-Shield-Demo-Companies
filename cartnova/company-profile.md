# CartNova -- Company Profile

## Overview

**Company:** CartNova
**Type:** Multi-category e-commerce marketplace
**Founded:** 4 years ago
**Size:** ~30-person engineering team
**HQ:** Amsterdam, Netherlands
**Business model:** Connects sellers with buyers across electronics, fashion, home goods, and more. Think a smaller, more curated marketplace -- not as large as Amazon, but more expansive than a single-brand store.

## What CartNova Does

CartNova operates a two-sided marketplace:

- **Buyers** browse products, search by category, add items to cart, and check out. They create accounts, save addresses, track orders, and leave reviews.
- **Sellers** list products via the seller API, manage inventory, track orders, and view analytics on their sales performance.
- **External partners** (payment providers, shipping carriers) integrate via webhooks to confirm payments and update shipping status.

The platform handles ~50,000 API requests per day across all services.

## Why They Represent the Digital Native Persona

CartNova maps to the **Self-Sufficient Adopter** persona from the research. This is the type of customer that Emmanuel described: *"they knew they needed that and they had API Shield and they configured it properly and we never heard from them."*

Key characteristics:
- **One team owns everything.** The same engineering team that built the APIs also manages security. No cross-team coordination needed.
- **They know their API surface.** Every endpoint was intentionally designed. They maintain OpenAPI specs. No shadow APIs (except the `/internal/` endpoints that shouldn't be public).
- **They arrive with specific needs.** They want JWT validation at the edge, rate limiting on public search, and sequence enforcement on checkout.
- **They understand what API Shield is (and isn't).** They know it's not an API gateway. They want edge security for their existing API infrastructure.
- **API-first architecture.** Their entire platform is built on the REST API. High ratio of dynamic API traffic vs. static content.

## Why CartNova Needs API Shield

1. **Checkout flow protection:** Their checkout sequence (start -> shipping -> payment -> confirm) needs sequence enforcement to prevent attackers from skipping steps or accessing other users' checkout sessions.
2. **JWT validation at the edge:** Currently validating JWTs at the origin. Want to offload to Cloudflare to reject invalid tokens before they hit the server.
3. **Rate limiting on public endpoints:** Product search and category browsing are public and frequently targeted by scraping bots.
4. **Schema validation:** They have OpenAPI specs and want to enforce request/response schemas to block malformed requests.
5. **Webhook verification:** Payment and shipping webhooks need mTLS to verify the caller is a legitimate partner.
6. **Sensitive data monitoring:** PII flows through user profile, checkout, and order endpoints. They want visibility into where sensitive data appears in API responses.

## Organizational Context

| Attribute | Value |
|-----------|-------|
| Security team | Same as engineering team -- security is part of the product org |
| API governance | Centralized. One team, one codebase, one set of standards. |
| Schema availability | Full OpenAPI v3 specs maintained in version control |
| Session identifier knowledge | Known: `Authorization: Bearer <JWT>` header |
| API documentation | Comprehensive. Public API docs for sellers, internal docs for all endpoints. |
| Cloudflare relationship | Existing customer (CDN, DNS, WAF). Adding API Shield as an upsell. |

## Expected API Shield Journey

This is what the happy path should look like:

1. **Discovery** -- Run discovery, see ~37 endpoints. Confirm they match what's expected. Notice the 3 internal endpoints that shouldn't be public.
2. **Endpoint Management** -- Save all endpoints. Organize by group (products, cart, checkout, users, sellers, orders, webhooks, internal).
3. **Schema Validation** -- Upload OpenAPI specs. Start in log mode. Review violations. Switch to enforcement.
4. **JWT Validation** -- Configure JWT rules for all authenticated endpoints. Test with valid/invalid/expired tokens.
5. **Session Identifiers** -- Configure `Authorization` header as session identifier. Quick -- they know exactly which header to use.
6. **Rate Limiting** -- Set rate limits on product search and category browsing.
7. **Sequence Mitigation** -- Define the checkout flow. Test sequence violations.
8. **Sensitive Data Detection** -- Review which endpoints return PII. Validate detection accuracy.
9. **Enforcement** -- Move from log mode to active enforcement across all configured rules.

**Target benchmark (from Nuno, SE):** 80% of discovered endpoints saved, 10% with active rules. CartNova should be able to exceed this.
