# CartNova -- API Architecture

## Architecture Overview

Clean, modern REST API. Single version prefix (`/api/v2/`). Consistent `kebab-case` naming. All endpoints intentionally designed and documented.

- **Total endpoints:** ~37
- **API style:** RESTful, resource-oriented
- **Versioning:** URL path (`/api/v2/`)
- **Content type:** `application/json`
- **Base URL:** `https://api.cartnova.example.com`

## Authentication Model

| Endpoint Group | Auth Method | Location | Notes |
|----------------|-------------|----------|-------|
| Products (browse/search) | None | -- | Public endpoints, no auth required |
| Cart, Checkout, Orders, Users | JWT Bearer | `Authorization: Bearer <token>` | Short-lived tokens (15 min), refresh via `/auth/refresh` |
| Product Reviews (POST) | JWT Bearer | `Authorization: Bearer <token>` | Must be authenticated to leave a review |
| Sellers | API Key | `X-Seller-Key` header | Unique per seller account |
| Webhooks | mTLS | Client certificate | Payment and shipping providers present client certs |
| Internal | None | -- | Should not be publicly accessible (but is) |

### JWT Token Structure

```json
{
  "sub": "user_a1b2c3d4",
  "email": "jane@example.com",
  "role": "buyer",
  "iat": 1700000000,
  "exp": 1700000900,
  "iss": "cartnova-auth"
}
```

- **Issuer:** `cartnova-auth`
- **Expiry:** 15 minutes
- **Refresh:** Via `/api/v2/auth/refresh` with a longer-lived refresh token in an HTTP-only cookie

### Session Identifier

For API Shield configuration: `Authorization` header. This is straightforward -- CartNova uses a single, consistent auth mechanism for all user-facing endpoints.

---

## Full Endpoint Inventory

### Products (8 endpoints)

Public, no authentication required. High traffic volume.

| Method | Path | Description | Response Data |
|--------|------|-------------|---------------|
| `GET` | `/api/v2/products` | List/search products. Supports `?q=`, `?category=`, `?page=`, `?limit=` | Array of product summaries |
| `GET` | `/api/v2/products/{product_id}` | Get product detail | Full product object with description, images, price, variants |
| `GET` | `/api/v2/products/{product_id}/reviews` | Get product reviews | Array of reviews with rating, text, author name |
| `POST` | `/api/v2/products/{product_id}/reviews` | Add a review (JWT auth) | Created review object |
| `GET` | `/api/v2/categories` | List all categories | Array of category objects |
| `GET` | `/api/v2/categories/{category_id}/products` | Products in a category | Array of product summaries |
| `GET` | `/api/v2/products/{product_id}/variants` | Get size/color variants | Array of variant objects (SKU, size, color, stock) |
| `GET` | `/api/v2/products/search` | Full-text search. Supports `?q=`, `?min_price=`, `?max_price=` | Array of product summaries |

### Cart (4 endpoints)

JWT auth required. Medium traffic.

| Method | Path | Description | Response Data |
|--------|------|-------------|---------------|
| `GET` | `/api/v2/cart` | View current cart | Cart object with items, subtotal, item count |
| `POST` | `/api/v2/cart/items` | Add item to cart | Updated cart object |
| `PUT` | `/api/v2/cart/items/{item_id}` | Update item quantity | Updated cart object |
| `DELETE` | `/api/v2/cart/items/{item_id}` | Remove item from cart | Updated cart object |

**Request body for POST /cart/items:**
```json
{
  "product_id": "prod_abc123",
  "variant_id": "var_size_m_blue",
  "quantity": 2
}
```

### Checkout (5 endpoints)

JWT auth required. Lower traffic but highest value. **This is the primary sequence flow.**

| Method | Path | Description | Response Data |
|--------|------|-------------|---------------|
| `POST` | `/api/v2/checkout/start` | Initiate checkout from current cart | Checkout object with `checkout_id`, cart snapshot |
| `PUT` | `/api/v2/checkout/{checkout_id}/shipping` | Set shipping address | Updated checkout with shipping details |
| `PUT` | `/api/v2/checkout/{checkout_id}/payment` | Set payment method | Updated checkout with payment token |
| `POST` | `/api/v2/checkout/{checkout_id}/confirm` | Place the order | Order confirmation with `order_id` |
| `GET` | `/api/v2/checkout/{checkout_id}/status` | Check checkout/order status | Status object (pending, confirmed, shipped, delivered) |

**Request body for PUT /checkout/{id}/shipping:**
```json
{
  "name": "Jane Smith",
  "address_line_1": "123 Main St",
  "address_line_2": "Apt 4B",
  "city": "Amsterdam",
  "postal_code": "1012 AB",
  "country": "NL",
  "phone": "+31 6 12345678"
}
```

**Request body for PUT /checkout/{id}/payment:**
```json
{
  "payment_method": "card",
  "card_token": "tok_visa_4242",
  "billing_address": {
    "name": "Jane Smith",
    "address_line_1": "123 Main St",
    "city": "Amsterdam",
    "postal_code": "1012 AB",
    "country": "NL"
  }
}
```

### Users (6 endpoints)

Mixed auth. Registration and login are public; everything else requires JWT.

| Method | Path | Description | Auth | Response Data |
|--------|------|-------------|------|---------------|
| `POST` | `/api/v2/auth/register` | Create account | None | User object + JWT |
| `POST` | `/api/v2/auth/login` | Login | None | JWT access token + refresh token |
| `POST` | `/api/v2/auth/refresh` | Refresh access token | Refresh token (cookie) | New JWT access token |
| `GET` | `/api/v2/users/me` | Get current user profile | JWT | Full user object (name, email, phone) |
| `PUT` | `/api/v2/users/me` | Update profile | JWT | Updated user object |
| `GET` | `/api/v2/users/me/addresses` | Get saved addresses | JWT | Array of address objects |

**Response for GET /users/me (contains PII):**
```json
{
  "id": "user_a1b2c3d4",
  "email": "jane@example.com",
  "name": "Jane Smith",
  "phone": "+31 6 12345678",
  "created_at": "2024-03-15T10:30:00Z"
}
```

### Orders (4 endpoints)

JWT auth required. Medium-low traffic.

| Method | Path | Description | Response Data |
|--------|------|-------------|---------------|
| `GET` | `/api/v2/orders` | Order history | Array of order summaries |
| `GET` | `/api/v2/orders/{order_id}` | Order detail | Full order (items, shipping, payment, status) |
| `GET` | `/api/v2/orders/{order_id}/tracking` | Shipping tracking | Tracking number, carrier, status updates |
| `POST` | `/api/v2/orders/{order_id}/return` | Initiate return | Return request object |

**Response for GET /orders/{id} (contains PII):**
```json
{
  "id": "ord_xyz789",
  "status": "shipped",
  "items": [
    {"product_id": "prod_abc123", "name": "Blue Jacket - Size M", "quantity": 1, "price": 89.99}
  ],
  "shipping": {
    "name": "Jane Smith",
    "address": "123 Main St, Apt 4B, Amsterdam 1012 AB, NL",
    "phone": "+31 6 12345678"
  },
  "payment": {
    "method": "card",
    "last_four": "4242",
    "amount": 99.98,
    "currency": "EUR"
  },
  "created_at": "2024-11-20T14:00:00Z"
}
```

### Sellers (5 endpoints)

API key auth via `X-Seller-Key` header. Lower traffic.

| Method | Path | Description | Response Data |
|--------|------|-------------|---------------|
| `GET` | `/api/v2/sellers/me/products` | List my product listings | Array of product objects |
| `POST` | `/api/v2/sellers/me/products` | Create a new listing | Created product object |
| `PUT` | `/api/v2/sellers/me/products/{product_id}` | Update a listing | Updated product object |
| `GET` | `/api/v2/sellers/me/analytics` | Sales dashboard data | Revenue, order count, top products |
| `GET` | `/api/v2/sellers/me/orders` | Orders for my products | Array of order objects |

### Webhooks (2 endpoints)

mTLS authentication. Event-driven, irregular traffic.

| Method | Path | Description | Caller |
|--------|------|-------------|--------|
| `POST` | `/api/v2/webhooks/payment` | Payment confirmation from payment provider | Stripe/Adyen (simulated) |
| `POST` | `/api/v2/webhooks/shipping` | Shipping status update from carrier | DHL/PostNL (simulated) |

**Webhook payload (payment):**
```json
{
  "event": "payment.confirmed",
  "payment_id": "pay_stripe_abc123",
  "order_id": "ord_xyz789",
  "amount": 99.98,
  "currency": "EUR",
  "timestamp": "2024-11-20T14:01:00Z"
}
```

### Internal (3 endpoints)

No authentication. These are meant for internal service-to-service communication but are accidentally reachable from the public internet.

| Method | Path | Description | Risk |
|--------|------|-------------|------|
| `GET` | `/internal/health` | Health check | Low -- but reveals service metadata |
| `GET` | `/internal/metrics` | Prometheus metrics | Medium -- exposes request counts, error rates |
| `POST` | `/internal/cache/invalidate` | Bust product cache | High -- could be abused to degrade performance |

---

## OpenAPI Spec

CartNova maintains a complete OpenAPI v3 specification (`cartnova-api-v2.yaml`). This spec will be created in the `specs/` directory and can be uploaded directly to API Shield for schema validation.

The spec covers:
- All 37 endpoints with full path, method, and parameter definitions
- Request body schemas for POST/PUT endpoints
- Response schemas for all endpoints
- Authentication requirements per endpoint
- Error response formats (400, 401, 403, 404, 500)

---

## Data Model Summary

### Key Entities

| Entity | ID Format | Example |
|--------|-----------|---------|
| User | `user_{8chars}` | `user_a1b2c3d4` |
| Product | `prod_{6chars}` | `prod_abc123` |
| Variant | `var_{descriptor}` | `var_size_m_blue` |
| Cart Item | `ci_{8chars}` | `ci_item0001` |
| Checkout | `chk_{8chars}` | `chk_sess0001` |
| Order | `ord_{6chars}` | `ord_xyz789` |
| Seller | `sel_{6chars}` | `sel_shop01` |

### Sensitive Data Map

| Endpoint | Data Type | Sensitivity |
|----------|-----------|-------------|
| `GET /api/v2/users/me` | Email, phone, full name | PII |
| `GET /api/v2/users/me/addresses` | Full postal addresses, phone | PII |
| `PUT /api/v2/checkout/{id}/shipping` | Full shipping address, phone | PII |
| `PUT /api/v2/checkout/{id}/payment` | Card token, billing address | Financial + PII |
| `GET /api/v2/orders/{id}` | Shipping address, payment last four, purchase history | PII + Financial |
| `POST /api/v2/webhooks/payment` | Payment amounts, transaction IDs | Financial |
| `GET /api/v2/sellers/me/analytics` | Revenue data | Business-sensitive |
