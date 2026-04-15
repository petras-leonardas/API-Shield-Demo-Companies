# CartNova -- Traffic Plan

## Overview

Traffic generation for CartNova simulates realistic e-commerce activity: browsing, shopping, seller management, and external webhook events. Five scripted journeys cover the full API surface, plus a set of attack patterns designed to exercise specific API Shield features.

All traffic flows through Cloudflare so API Shield discovery can observe it.

---

## Journey 1: Happy Path Checkout (Primary Sequence Test)

**Purpose:** The most important journey. Exercises the full checkout flow that will be protected by sequence mitigation rules.

**Auth:** JWT Bearer token (obtained at login)

**Flow:**
```
1. POST /api/v2/auth/login              → Authenticate, receive JWT
2. GET  /api/v2/products                → Browse product catalog
3. GET  /api/v2/products/{product_id}   → View product detail
4. POST /api/v2/cart/items              → Add item to cart
5. GET  /api/v2/cart                    → View cart
6. POST /api/v2/checkout/start          → Initiate checkout
7. PUT  /api/v2/checkout/{id}/shipping  → Set shipping address
8. PUT  /api/v2/checkout/{id}/payment   → Set payment method
9. POST /api/v2/checkout/{id}/confirm   → Place order
10. GET /api/v2/checkout/{id}/status    → Check order status
```

**Variations to simulate:**
- Different products (vary `product_id` across catalog)
- Different quantities (1-5 items)
- Different shipping addresses
- Some users add multiple items before checkout
- Some users browse several products before adding

**Volume:** 50-100 complete journeys per hour

**API Shield features tested:**
- Endpoint Discovery (all endpoints appear)
- JWT Validation (all steps after login use the JWT)
- Sequence Mitigation (the 7-step checkout flow)
- Sensitive Data Detection (PII in shipping/payment steps)

---

## Journey 2: Guest Browsing (Unauthenticated, High Volume)

**Purpose:** Simulates unauthenticated browsing traffic. Target for rate limiting.

**Auth:** None

**Flow:**
```
1. GET /api/v2/products/search?q={term}         → Search products
2. GET /api/v2/categories                        → Browse categories
3. GET /api/v2/categories/{category_id}/products → View category
4. GET /api/v2/products/{product_id}             → View product
5. GET /api/v2/products/{product_id}/reviews     → Read reviews
6. GET /api/v2/products/{product_id}/variants    → Check variants
```

**Variations:**
- Different search terms (clothing, electronics, home, etc.)
- Different categories
- Different products per category
- Some sessions are just search, some are deep browsing

**Volume:** 200-500 requests per hour (highest traffic journey)

**API Shield features tested:**
- Endpoint Discovery (public endpoints)
- Rate Limiting (high volume on search/browse)
- Schema Validation (request parameter validation)

---

## Journey 3: Seller Activity (API Key Auth)

**Purpose:** Simulates seller-side operations via the seller API.

**Auth:** `X-Seller-Key` header

**Flow:**
```
1. GET  /api/v2/sellers/me/products                    → List my listings
2. POST /api/v2/sellers/me/products                    → Create a new listing
3. PUT  /api/v2/sellers/me/products/{product_id}       → Update listing
4. GET  /api/v2/sellers/me/analytics                   → Check sales dashboard
5. GET  /api/v2/sellers/me/orders                      → View orders
```

**Variations:**
- 3-5 different seller accounts (different API keys)
- Create listings with different categories and price ranges
- Update stock quantities periodically

**Volume:** 20-30 requests per hour

**API Shield features tested:**
- Endpoint Discovery (seller endpoints)
- Auth differentiation (API key vs. JWT -- different auth mechanism on same domain)

---

## Journey 4: Webhook Events (mTLS Auth)

**Purpose:** Simulates incoming webhook calls from payment and shipping partners.

**Auth:** mTLS (client certificate)

**Flow:**
```
1. POST /api/v2/webhooks/payment    → Payment confirmation
2. POST /api/v2/webhooks/shipping   → Shipping status update
```

**Variations:**
- Payment events: `payment.confirmed`, `payment.failed`, `payment.refunded`
- Shipping events: `shipment.created`, `shipment.in_transit`, `shipment.delivered`
- Random delays between events (simulating real-world async processing)

**Volume:** 10-20 requests per hour (event-driven)

**API Shield features tested:**
- Endpoint Discovery (webhook endpoints)
- mTLS verification
- Schema Validation (webhook payload structure)

---

## Journey 5: Attack Patterns

**Purpose:** Generate traffic that should be detected/blocked by API Shield features.

### 5a: Rate Limit Abuse
```
# 100 rapid search requests in 10 seconds
GET /api/v2/products/search?q=laptop  (x100, no delay)
```
**Tests:** Rate limiting rules on product search

### 5b: Sequence Violation -- Skip to Confirm
```
POST /api/v2/auth/login               → Get JWT
POST /api/v2/checkout/{id}/confirm     → Skip directly to confirm (no cart, no shipping, no payment)
```
**Tests:** Sequence mitigation -- confirm should be blocked without prior checkout steps

### 5c: Sequence Violation -- Access Other User's Checkout
```
POST /api/v2/auth/login               → Get JWT for User A
GET  /api/v2/checkout/{user_b_id}/status → Try to access User B's checkout
```
**Tests:** BOLA detection + JWT scope validation

### 5d: JWT Attacks
```
# Expired token
GET /api/v2/cart  (with JWT expired 1 hour ago)

# Invalid signature
GET /api/v2/cart  (with JWT signed by wrong key)

# Token from different user
GET /api/v2/orders/ord_xyz789  (User A's JWT, User B's order)
```
**Tests:** JWT validation rules

### 5e: BOLA Enumeration
```
# Iterate through sequential order IDs
GET /api/v2/orders/ord_000001
GET /api/v2/orders/ord_000002
GET /api/v2/orders/ord_000003
... (100 sequential IDs)
```
**Tests:** BOLA vulnerability detection, rate limiting

### 5f: Shadow API Probing
```
# Access internal endpoints from public internet
GET /internal/health
GET /internal/metrics
POST /internal/cache/invalidate
```
**Tests:** Endpoint Discovery (these should show up as unmanaged/unprotected endpoints)

---

## Journey 6: Vulnerability Scanner (API-Driven, On-Demand)

**Purpose:** Tests the active BOLA vulnerability scanner. Unlike the passive BOLA detection labels (which analyze traffic patterns), the Vulnerability Scanner actively probes endpoints using two credential sets to find authorization flaws.

**Auth:** Two JWT credential sets (Owner and Attacker)

**Prerequisites:**
- CartNova's OpenAPI spec (`cartnova-api-v2.yaml`) must be uploaded as the scan target
- Two user accounts must exist with different data (orders, checkouts, cart items)

**Setup (via Cloudflare API):**
```
1. Create target environment (zone-based)
2. Create "Owner" credential set:
   - Credential: Authorization header with User A's JWT
3. Create "Attacker" credential set:
   - Credential: Authorization header with User B's JWT
4. Start BOLA scan with:
   - Target environment ID
   - OpenAPI spec (cartnova-api-v2.yaml)
   - Owner credential set ID
   - Attacker credential set ID
5. Poll scan status until completed
6. Retrieve scan report
```

**Expected findings:**
- Checkout endpoints (`/checkout/{id}/status`, `/checkout/{id}/shipping`) may show BOLA if the server doesn't enforce ownership
- Order endpoints (`/orders/{id}`, `/orders/{id}/tracking`) may allow User B to access User A's orders
- Cart endpoints should be safe (cart is tied to the authenticated user, not a path variable)

**Volume:** N/A -- this is an on-demand API-driven scan, not a traffic journey

**API Shield features tested:**
- Vulnerability Scanner (primary)
- Cross-validates with BOLA Detection labels (do passive labels agree with active scan findings?)

---

## Traffic Runner Configuration

The traffic runner orchestrates all journeys with configurable parameters:

```
Runner config:
  - base_url: https://api.cartnova.example.com
  - journeys:
      checkout:    { concurrency: 5,  interval: "30s" }
      browsing:    { concurrency: 10, interval: "5s"  }
      seller:      { concurrency: 2,  interval: "120s" }
      webhooks:    { concurrency: 1,  interval: "300s" }
      attacks:     { enabled: false, run_once: true }
  - duration: "1h"  (or continuous)
  - logging: true (log all requests for comparison with discovery)
```

Attack patterns are disabled by default and run on-demand to test specific features.
