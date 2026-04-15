# CartNova Frontend Implementation Plan

## Goal

Build a mock e-commerce frontend for CartNova that:
- Visualizes the full user experience end-to-end
- Makes real API calls through Cloudflare so traffic feeds API Shield
- Maps each page clearly to the endpoints it calls
- Makes the checkout sequence flow tangible for sequence mitigation testing

---

## Architecture

**Tech:** Vanilla HTML / CSS (Tailwind CDN) / JavaScript. No build step.

**Hosting:** Served from the same `carnova.uk` domain using Cloudflare Workers static assets. The existing Hono API Worker stays untouched -- static files are checked first, and unmatched requests fall through to the API routes.

**Only change to existing code:** Add `[assets]` directive to `cartnova/api/wrangler.toml`:
```toml
[assets]
directory = "./public"
```

**Auth:** JWT tokens stored in `localStorage`. Login page obtains the token, all authenticated pages read it and pass it as `Authorization: Bearer <token>`.

**Seller auth:** API key entered manually on the seller dashboard page, stored in `sessionStorage`.

---

## File Structure

```
cartnova/api/
  public/
    index.html                # Home -- product grid, search, categories
    product.html              # Product detail -- info, reviews, variants
    category.html             # Category product listing
    cart.html                 # Shopping cart
    checkout.html             # Multi-step checkout (critical for sequence mitigation)
    login.html                # Login + Register
    account.html              # Profile, addresses
    orders.html               # Order history, detail, tracking
    seller.html               # Seller dashboard (API key auth)
    css/
      styles.css              # Custom styles on top of Tailwind
    js/
      api.js                  # Shared fetch wrapper -- all API calls go through here
      auth.js                 # JWT token management (get/set/clear from localStorage)
      nav.js                  # Shared header/navigation, injected into every page
      home.js                 # Home page logic
      product.js              # Product detail logic
      category.js             # Category page logic
      cart.js                 # Cart page logic
      checkout.js             # Checkout flow logic
      login.js                # Login/register form logic
      account.js              # Account page logic
      orders.js               # Orders page logic
      seller.js               # Seller dashboard logic
  wrangler.toml               # Updated with [assets] directive
  src/                        # Existing API code -- NO changes
```

---

## Pages

### 1. Home / Catalog (`index.html`)

The landing page. Product grid with search and category navigation.

**Layout:**
- Top nav bar (shared across all pages)
- Search bar (prominent)
- Category sidebar or horizontal filter chips
- Product card grid (image placeholder, name, price, rating)
- Pagination controls

**Endpoints called:**
| Trigger | Method | Endpoint |
|---------|--------|----------|
| Page load | `GET` | `/api/v2/products?page=1&limit=12` |
| Page load | `GET` | `/api/v2/categories` |
| Search submit | `GET` | `/api/v2/products/search?q={term}` |
| Pagination | `GET` | `/api/v2/products?page={n}&limit=12` |

**Links to:** Product Detail (click product card), Category (click category)

---

### 2. Product Detail (`product.html`)

Single product view with reviews and variant selection.

**URL:** `product.html?id={product_id}`

**Layout:**
- Product image area (placeholder)
- Product name, price, description, rating
- Variant/size selector (dropdown or buttons)
- "Add to Cart" button (requires login, prompts if not authenticated)
- Reviews section (list of reviews with rating, title, comment)

**Endpoints called:**
| Trigger | Method | Endpoint |
|---------|--------|----------|
| Page load | `GET` | `/api/v2/products/{product_id}` |
| Page load | `GET` | `/api/v2/products/{product_id}/reviews` |
| Page load | `GET` | `/api/v2/products/{product_id}/variants` |
| Add to Cart click | `POST` | `/api/v2/cart/items` |

**Links to:** Cart (after adding item), Home (breadcrumb)

---

### 3. Category (`category.html`)

Filtered product listing for a specific category.

**URL:** `category.html?id={category_id}`

**Layout:**
- Category name as page heading
- Product card grid (same card component as home)

**Endpoints called:**
| Trigger | Method | Endpoint |
|---------|--------|----------|
| Page load | `GET` | `/api/v2/categories/{category_id}/products` |

**Links to:** Product Detail (click product card), Home (breadcrumb)

---

### 4. Login / Register (`login.html`)

Authentication page with toggle between login and register forms.

**Layout:**
- Tab toggle: Login | Register
- Login form: email + password + submit
- Register form: name + email + password + submit
- Success: redirect to previous page or home

**Endpoints called:**
| Trigger | Method | Endpoint |
|---------|--------|----------|
| Login submit | `POST` | `/api/v2/auth/login` |
| Register submit | `POST` | `/api/v2/auth/register` |

**Post-auth:** Store `access_token` in `localStorage`. Redirect to referrer or home.

**Links to:** Home (after auth), wherever the user came from

---

### 5. Cart (`cart.html`)

Shopping cart management. **Requires authentication.**

**Layout:**
- Cart item list (product name, variant, quantity, price, line total)
- Quantity +/- controls per item
- Remove item button per item
- Cart subtotal
- "Proceed to Checkout" button

**Endpoints called:**
| Trigger | Method | Endpoint |
|---------|--------|----------|
| Page load | `GET` | `/api/v2/cart` |
| Change quantity | `PUT` | `/api/v2/cart/items/{item_id}` |
| Remove item | `DELETE` | `/api/v2/cart/items/{item_id}` |
| Proceed to Checkout | `POST` | `/api/v2/checkout/start` |

**Links to:** Checkout (proceed), Product Detail (click item name), Login (if not auth'd)

---

### 6. Checkout (`checkout.html`) -- CRITICAL PAGE

Multi-step checkout flow. This is the primary page for **sequence mitigation testing**. The step-by-step progression matches the sequence rule you'll configure in API Shield.

**Requires authentication.** Receives `checkout_id` from Cart page (via URL param or sessionStorage).

**Layout:**
- **Progress bar** showing all steps: `Cart -> Shipping -> Payment -> Confirm -> Done`
- Active step highlighted, completed steps checked
- Each step is a form/panel that appears in sequence
- The `checkout_id` displayed visibly (for tracing in API Shield)
- Each step shows the endpoint being called (small annotation)

**Step-by-step flow:**

| Step | What the user sees | Endpoint called |
|------|-------------------|-----------------|
| **1. Start** | Automatic on arrival (checkout already started from Cart page) | `POST /api/v2/checkout/start` (called on Cart page) |
| **2. Shipping** | Address form: name, address, city, postal code, country, phone | `PUT /api/v2/checkout/{checkout_id}/shipping` |
| **3. Payment** | Payment method selector, card token field, billing address | `PUT /api/v2/checkout/{checkout_id}/payment` |
| **4. Confirm** | Order summary (items, shipping, payment). "Place Order" button | `POST /api/v2/checkout/{checkout_id}/confirm` |
| **5. Done** | Confirmation message with order ID and status | `GET /api/v2/checkout/{checkout_id}/status` |

**Why this page matters:**
- Sequence mitigation rules in API Shield define the allowed order of API calls
- This page makes the intended sequence visible and testable
- You can verify that the rule allows this flow and blocks out-of-order calls (e.g., jumping straight to confirm)

**Links to:** Orders (after confirmation), Home (continue shopping)

---

### 7. My Account (`account.html`)

User profile and saved addresses. **Requires authentication.**

**Layout:**
- Profile card: name, email, phone
- Edit profile form (inline toggle)
- Saved addresses list

**Endpoints called:**
| Trigger | Method | Endpoint |
|---------|--------|----------|
| Page load | `GET` | `/api/v2/users/me` |
| Page load | `GET` | `/api/v2/users/me/addresses` |
| Save profile | `PUT` | `/api/v2/users/me` |

**Links to:** Orders (nav link)

---

### 8. My Orders (`orders.html`)

Order history with drill-down into detail and tracking. **Requires authentication.**

**Layout:**
- Order list table: order ID, status, item count, total, date
- Click an order to expand/show detail panel:
  - Items list
  - Shipping address
  - Payment info (last four digits)
  - Tracking timeline (carrier, tracking number, status updates)
  - Return button (for delivered orders)

**Endpoints called:**
| Trigger | Method | Endpoint |
|---------|--------|----------|
| Page load | `GET` | `/api/v2/orders` |
| Click order | `GET` | `/api/v2/orders/{order_id}` |
| View tracking | `GET` | `/api/v2/orders/{order_id}/tracking` |
| Request return | `POST` | `/api/v2/orders/{order_id}/return` |

**Links to:** Account (nav), Product Detail (click item in order)

---

### 9. Seller Dashboard (`seller.html`)

Separate section for seller/merchant operations. Uses API key auth instead of JWT.

**Layout:**
- API key input field at the top (with "Connect" button)
- Once connected:
  - Product listings table (with "Add Product" form)
  - Analytics summary (revenue, order count, top products)
  - Recent orders table

**Endpoints called:**
| Trigger | Method | Endpoint | Auth |
|---------|--------|----------|------|
| Connect | `GET` | `/api/v2/sellers/me/products` | `X-Seller-Key` |
| Page load | `GET` | `/api/v2/sellers/me/analytics` | `X-Seller-Key` |
| Page load | `GET` | `/api/v2/sellers/me/orders` | `X-Seller-Key` |
| Add product | `POST` | `/api/v2/sellers/me/products` | `X-Seller-Key` |
| Edit product | `PUT` | `/api/v2/sellers/me/products/{product_id}` | `X-Seller-Key` |

**Test API keys** (pre-filled as selectable options):
- TechVault: `sk_tv_live_a1b2c3d4e5f6`
- NordicWear: `sk_nw_live_g7h8i9j0k1l2`
- HomeEssence: `sk_he_live_m3n4o5p6q7r8`

---

## Shared Components

### Navigation Bar (`nav.js`)

Injected at the top of every page. Shows:
- CartNova logo/name (links to home)
- Search bar (submits to home page with search param)
- Nav links: Categories, Cart (with item count badge), Orders
- Auth state: "Login" link or user name + "Logout"
- Seller Dashboard link (separate from main nav, footer or secondary nav)

### API Client (`api.js`)

Single module that all page scripts use:
```
api.get(path)           -- GET request, auto-attaches JWT if present
api.post(path, body)    -- POST request
api.put(path, body)     -- PUT request
api.del(path)           -- DELETE request
api.seller.get(path)    -- GET with X-Seller-Key header
api.seller.post(path, body)
```

Handles:
- Automatic JWT attachment from localStorage
- 401 responses -> redirect to login page
- Response parsing (JSON)
- Error display (toast or inline)

### Auth Module (`auth.js`)

```
auth.getToken()         -- Read JWT from localStorage
auth.setToken(token)    -- Store JWT
auth.clear()            -- Logout (clear token)
auth.isLoggedIn()       -- Boolean check
auth.getUserInfo()      -- Decode JWT payload for display (name, email)
auth.requireAuth()      -- Redirect to login if not authenticated
```

---

## Endpoint Coverage Summary

All 37 CartNova endpoints mapped to frontend pages:

| # | Endpoint | Page(s) |
|---|----------|---------|
| 1 | `GET /api/v2/products` | Home |
| 2 | `GET /api/v2/products/search` | Home (search) |
| 3 | `GET /api/v2/products/{id}` | Product Detail |
| 4 | `GET /api/v2/products/{id}/reviews` | Product Detail |
| 5 | `POST /api/v2/products/{id}/reviews` | Product Detail (leave review) |
| 6 | `GET /api/v2/products/{id}/variants` | Product Detail |
| 7 | `GET /api/v2/categories` | Home (sidebar/filter) |
| 8 | `GET /api/v2/categories/{id}/products` | Category |
| 9 | `GET /api/v2/cart` | Cart |
| 10 | `POST /api/v2/cart/items` | Product Detail (add to cart) |
| 11 | `PUT /api/v2/cart/items/{id}` | Cart (update qty) |
| 12 | `DELETE /api/v2/cart/items/{id}` | Cart (remove) |
| 13 | `POST /api/v2/checkout/start` | Cart (proceed to checkout) |
| 14 | `PUT /api/v2/checkout/{id}/shipping` | Checkout step 2 |
| 15 | `PUT /api/v2/checkout/{id}/payment` | Checkout step 3 |
| 16 | `POST /api/v2/checkout/{id}/confirm` | Checkout step 4 |
| 17 | `GET /api/v2/checkout/{id}/status` | Checkout step 5 |
| 18 | `POST /api/v2/auth/register` | Login (register tab) |
| 19 | `POST /api/v2/auth/login` | Login |
| 20 | `POST /api/v2/auth/refresh` | Auto (when token nears expiry) |
| 21 | `GET /api/v2/users/me` | Account |
| 22 | `PUT /api/v2/users/me` | Account (edit) |
| 23 | `GET /api/v2/users/me/addresses` | Account |
| 24 | `GET /api/v2/orders` | Orders |
| 25 | `GET /api/v2/orders/{id}` | Orders (detail) |
| 26 | `GET /api/v2/orders/{id}/tracking` | Orders (tracking) |
| 27 | `POST /api/v2/orders/{id}/return` | Orders (return) |
| 28 | `GET /api/v2/sellers/me/products` | Seller Dashboard |
| 29 | `POST /api/v2/sellers/me/products` | Seller Dashboard (add) |
| 30 | `PUT /api/v2/sellers/me/products/{id}` | Seller Dashboard (edit) |
| 31 | `GET /api/v2/sellers/me/analytics` | Seller Dashboard |
| 32 | `GET /api/v2/sellers/me/orders` | Seller Dashboard |
| 33 | `POST /api/v2/webhooks/payment` | N/A (external webhook, no UI) |
| 34 | `POST /api/v2/webhooks/shipping` | N/A (external webhook, no UI) |
| 35 | `GET /internal/health` | N/A (internal, no UI) |
| 36 | `GET /internal/metrics` | N/A (internal, no UI) |
| 37 | `POST /internal/cache/invalidate` | N/A (internal, no UI) |

**34 of 37 endpoints** have a corresponding UI action. The 3 without UI are webhooks (external system callbacks) and internal endpoints (accidentally exposed, no legitimate frontend use).

---

## Implementation Order

Build in this order so each phase is independently deployable and testable:

### Phase 1: Foundation
- [ ] Update `wrangler.toml` with `[assets]` directive
- [ ] Create `public/css/styles.css` (Tailwind customizations)
- [ ] Create `public/js/api.js` (API client)
- [ ] Create `public/js/auth.js` (JWT management)
- [ ] Create `public/js/nav.js` (shared navigation)

### Phase 2: Public Browsing (no auth required)
- [ ] `index.html` + `home.js` -- product grid, search, categories
- [ ] `product.html` + `product.js` -- product detail, reviews, variants
- [ ] `category.html` + `category.js` -- category listing
- [ ] Deploy and verify browsing works on carnova.uk

### Phase 3: Authentication
- [ ] `login.html` + `login.js` -- login and register forms
- [ ] Verify JWT flow: login -> token stored -> authenticated requests work

### Phase 4: Shopping Flow (the critical path)
- [ ] `cart.html` + `cart.js` -- cart management
- [ ] `checkout.html` + `checkout.js` -- multi-step checkout with progress bar
- [ ] End-to-end test: browse -> add to cart -> checkout -> confirm
- [ ] Deploy and verify the full sequence on carnova.uk

### Phase 5: Account & Orders
- [ ] `account.html` + `account.js` -- profile, addresses
- [ ] `orders.html` + `orders.js` -- order list, detail, tracking, returns

### Phase 6: Seller Dashboard
- [ ] `seller.html` + `seller.js` -- API key auth, product management, analytics

### Phase 7: Polish & Deploy
- [ ] Cross-page navigation testing
- [ ] Auth state consistency (logged in/out across pages)
- [ ] Final deploy to carnova.uk

---

## Design Notes

- **Tailwind via CDN** (`<script src="https://cdn.tailwindcss.com">`). No build step. This is for demos, not production.
- **Product images** use colored placeholder divs with the product name (no actual images to host).
- **Responsive** is not a priority. Desktop-first, functional layout.
- **Every page** includes a small "API Endpoints" annotation (collapsible) showing which endpoints are called on that page. This is the whole point -- making the API surface visible.
- **Test credentials** displayed on the login page for convenience (emma.johnson@example.com, etc.).
