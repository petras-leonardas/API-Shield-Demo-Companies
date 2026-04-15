# MeridianBank -- API Architecture

## Architecture Overview

Chaotic. Built by at least 6 different teams over 12 years. Seven distinct API styles coexist with no central governance, no shared standards, and no single source of truth.

- **Total endpoints (designed core):** ~40
- **Total endpoints (with generated sprawl):** 100-150+
- **API styles:** 7 different conventions (REST variants, SOAP wrapper, GraphQL)
- **Auth mechanisms:** 5 different methods (JWT, API Key, mTLS, Basic Auth, none)
- **Base URLs:** Multiple subdomains -- `banking.meridianbank.example.com`, `partners.meridianbank.example.com`, `app.meridianbank.example.com`, etc. (or all on one domain to make discovery messier)

## Authentication Mess

This is one of the biggest barriers to API Shield adoption. The security team cannot answer "which header identifies a session?" because the answer depends on which service you're asking about.

| Service Group | Auth Method | Token Location | Era |
|---------------|-------------|----------------|-----|
| Mobile Banking | JWT Bearer | `Authorization: Bearer <token>` | 2022 |
| Online Portal | API Key | `X-API-Key` header | 2016 |
| Partner APIs | mTLS + API Key | Client certificate + `X-Partner-Key` header | 2019 |
| Internal Services | **None** | -- (accidentally exposed) | Various |
| Wealth Management | Basic Auth | `Authorization: Basic <base64>` | 2020 (acquired) |
| Card Services | WS-Security | SOAP header | 2014 |
| GraphQL Gateway | JWT Bearer | `Authorization: Bearer <token>` | 2023 |

### Session Identifier Problem

For API Shield features like rate limiting and sequence detection, a session identifier must be configured. But:
- Mobile banking uses `Authorization: Bearer <JWT>` -- the JWT changes every 15 minutes
- Online portal uses `X-API-Key` -- static, per-customer
- Partner APIs use `X-Partner-Key` -- static, per-partner
- Internal services have no session concept
- Wealth management uses `Authorization: Basic <credentials>` -- same header name as JWT but different format

**There is no single header that identifies a session across all services.** This is the bottleneck that Tamires described: *"We can't like we can only map what the customer knows."*

---

## Designed Core Endpoints (~40 endpoints)

### Mobile Banking -- Modern REST, JWT Auth (9 endpoints)

Built by the mobile team in 2022. Clean, well-designed. The only "good" APIs in the system.

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/v3/auth/login` | Login (returns JWT) | None (public) |
| `POST` | `/api/v3/auth/mfa/verify` | MFA verification | JWT |
| `POST` | `/api/v3/auth/token/refresh` | Token refresh | Refresh token (cookie) |
| `GET` | `/api/v3/accounts` | List user accounts | JWT |
| `GET` | `/api/v3/accounts/{account_id}` | Account detail | JWT |
| `GET` | `/api/v3/accounts/{account_id}/transactions` | Transaction history | JWT |
| `GET` | `/api/v3/accounts/{account_id}/balance` | Check balance | JWT |
| `POST` | `/api/v3/accounts/{account_id}/transfers` | Initiate transfer | JWT |
| `GET` | `/api/v3/accounts/{account_id}/transfers/{transfer_id}` | Transfer status | JWT |

**Response for GET /accounts/{id}/transactions (contains financial data):**
```json
{
  "account_id": "ACC-12345",
  "transactions": [
    {
      "id": "TXN-67890",
      "date": "2024-11-20",
      "description": "Payment to ACME Corp",
      "amount": -450.00,
      "currency": "EUR",
      "counterparty_iban": "DE89370400440532013000"
    }
  ]
}
```

### Online Banking Portal -- Legacy REST, API Key Auth (5 endpoints)

Built by the web team in 2016. Different naming conventions. Uses `camelCase` verbs instead of RESTful resources. Query parameters instead of path parameters.

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/banking/api/doLogin` | Legacy login | None (returns API key) |
| `GET` | `/banking/api/getAccounts` | List accounts | `X-API-Key` |
| `GET` | `/banking/api/getTransactions?accountId={id}` | Transactions (query param, not path) | `X-API-Key` |
| `POST` | `/banking/api/doTransfer` | Initiate transfer | `X-API-Key` |
| `POST` | `/banking/api/validatePayment` | Validate payment | `X-API-Key` |

**Note:** These endpoints do the same thing as the mobile banking endpoints but with completely different URL patterns, naming conventions, and auth. Discovery finds both sets. The security team doesn't know which is current.

### Partner/B2B APIs -- mTLS + API Key (5 endpoints)

Built by the partnerships team in 2019. Uses mTLS for mutual authentication plus an API key for authorization.

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/partners/v1/payments/process` | Process a payment | mTLS + `X-Partner-Key` |
| `GET` | `/partners/v1/payments/{payment_id}/status` | Payment status | mTLS + `X-Partner-Key` |
| `POST` | `/partners/v1/kyc/verify` | KYC identity verification | mTLS + `X-Partner-Key` |
| `GET` | `/partners/v1/rates/exchange` | FX exchange rates | mTLS + `X-Partner-Key` |
| `POST` | `/partners/v2/payments/initiate` | Newer payment initiation (v2) | mTLS + `X-Partner-Key` |

**Response for POST /partners/v1/kyc/verify (CRITICAL -- contains SSN/tax ID):**
```json
{
  "verification_id": "kyc-v-001",
  "status": "verified",
  "customer": {
    "full_name": "Hans Mueller",
    "date_of_birth": "1985-03-15",
    "tax_id": "12 345 678 901",
    "nationality": "DE",
    "address": "Berliner Str. 42, 60311 Frankfurt, Germany"
  },
  "risk_score": "low",
  "verified_at": "2024-11-20T10:00:00Z"
}
```

**Note:** There are two versions of payment initiation (`v1/payments/process` and `v2/payments/initiate`). Different request schemas. Both active. The security team doesn't know the difference.

### Internal Services -- NO AUTH, Accidentally Exposed (7 endpoints)

Built as internal microservices for service-to-service communication. They were never meant to be publicly accessible, but due to a routing misconfiguration, they are reachable from the public internet.

| Method | Path | Description | Risk Level |
|--------|------|-------------|------------|
| `GET` | `/internal/risk-engine/score/{customer_id}` | Customer risk scoring | **Critical** -- exposes risk profiles |
| `POST` | `/internal/compliance/check` | Run compliance check | **High** -- can trigger compliance workflows |
| `GET` | `/internal/audit/log?from={date}&to={date}` | Query audit logs | **Critical** -- PII in log entries |
| `GET` | `/svc/notification/templates` | List notification templates | **Medium** -- reveals internal messaging |
| `POST` | `/svc/notification/send` | Send notification | **High** -- could be used for spam/phishing |
| `GET` | `/health` | Generic health check | **Low** -- but reveals service metadata |
| `GET` | `/metrics` | Prometheus metrics endpoint | **Medium** -- exposes operational data |

**Response for GET /internal/risk-engine/score/{id} (CRITICAL -- no auth required):**
```json
{
  "customer_id": "CUST-98765",
  "risk_score": 72,
  "risk_level": "medium",
  "factors": [
    "high_transaction_volume",
    "cross_border_transfers",
    "new_account"
  ],
  "last_assessed": "2024-11-19T23:00:00Z"
}
```

### GraphQL Gateway -- Modernization Experiment, JWT Auth (2 endpoints)

Built by a developer on the mobile team in 2023 during the microservices refactor. The idea was to provide a unified query layer over the fragmented account and transaction data -- one endpoint to rule them all. The project was never officially approved, never completed, and never documented. But the endpoint is live, receives traffic from a prototype mobile app feature, and nobody has turned it off.

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/v3/graphql` | Main GraphQL endpoint (queries and mutations) | JWT |
| `GET` | `/api/v3/graphql` | GraphQL Playground/IDE (should be disabled in production) | None |

**Supported queries:**
```graphql
# Account queries (pulls from mobile banking backend)
query {
  accounts {
    id
    balance
    currency
    transactions(limit: 10) {
      id
      date
      amount
      description
      counterpartyIban
    }
  }
}

# Single account with nested data
query {
  account(id: "ACC-12345") {
    balance
    transactions {
      id
      amount
      description
    }
    transfers {
      id
      status
      amount
    }
  }
}
```

**Supported mutations:**
```graphql
# Transfer money (wraps the mobile banking transfer endpoint)
mutation {
  initiateTransfer(
    fromAccount: "ACC-12345"
    toIban: "DE89370400440532013000"
    amount: 250.00
    currency: "EUR"
  ) {
    transferId
    status
  }
}
```

**Why this matters for testing:**
- **GraphQL Query Protection:** The only GraphQL endpoint in either company. Required for testing depth/size limits.
- **Introspection is enabled:** `GET /api/v3/graphql` serves a GraphQL Playground UI, and introspection queries are not disabled. An attacker can discover the full schema.
- **Nesting depth is unbounded:** A malicious query could nest `accounts → transactions → account → transactions → ...` if the resolvers aren't careful. This is what GraphQL Query Protection should catch.
- **Shares auth with mobile banking:** Uses the same JWT, so JWT validation rules for `/api/v3/` cover it. But the GET endpoint (Playground) has no auth.
- **Discovery interaction:** API Shield discovery will find `POST /api/v3/graphql` as a single endpoint, but it represents dozens of possible query shapes -- a different kind of "surface area" than REST endpoints.

### Wealth Management -- Acquired Company, Basic Auth (4 endpoints)

Inherited from an acquisition 5 years ago. Never re-platformed. Uses Basic Auth (base64 encoded `username:password`). Different URL structure.

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/wm/api/1.0/portfolios` | List portfolios | Basic Auth |
| `GET` | `/wm/api/1.0/portfolios/{id}/holdings` | Portfolio holdings | Basic Auth |
| `POST` | `/wm/api/1.0/portfolios/{id}/rebalance` | Rebalance portfolio | Basic Auth |
| `GET` | `/wm/api/1.0/market-data/quotes/{symbol}` | Market quotes | Basic Auth |

**Note:** Version `1.0` with a dot, not `v1`. Different convention from every other service.

### Card Services -- Legacy SOAP Wrapper (3 endpoints)

The oldest APIs in the system. Originally SOAP, now wrapped in a thin REST layer. `PascalCase` naming. Still processes real card data.

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/cardservices/xmlapi/cardActivation` | Activate a card | WS-Security headers |
| `POST` | `/cardservices/xmlapi/cardBlock` | Block a card | WS-Security headers |
| `GET` | `/cardservices/xmlapi/getCardStatus?cardNumber={num}` | Get card status | WS-Security headers |

**Response for GET /cardservices/xmlapi/getCardStatus (CRITICAL -- full card number in URL and response):**
```json
{
  "cardNumber": "4532015112830366",
  "cardHolder": "Hans Mueller",
  "status": "active",
  "expiryDate": "12/2026",
  "cardType": "VISA_PLATINUM",
  "dailyLimit": 5000.00
}
```

### Deprecated/Shadow Endpoints -- Nobody Owns These (5 endpoints)

These endpoints are still receiving traffic but have no documented owner. Some are old API versions, some are test endpoints that were never removed, some are debug tools that should never have been deployed to production.

| Method | Path | Description | Auth | Traffic |
|--------|------|-------------|------|---------|
| `GET` | `/api/v1/accounts` | Old version of account list | JWT (old format) | ~200 req/day |
| `GET` | `/old-portal/user/info` | Legacy portal user endpoint | Session cookie | ~50 req/day |
| `POST` | `/test/transfer` | Test endpoint left in production | None | ~10 req/day |
| `GET` | `/debug/db-status` | Database connection status | None | ~5 req/day |
| `GET` | `/api/v2/accounts` | Mid-generation, deprecated | JWT | ~100 req/day |

**Response for GET /debug/db-status (CRITICAL -- database connection strings exposed, no auth):**
```json
{
  "database": "postgresql://meridian_app:p4ssw0rd@db-primary.internal:5432/meridian_prod",
  "status": "connected",
  "pool_size": 20,
  "active_connections": 12,
  "replica": "postgresql://meridian_read:r34d0nly@db-replica.internal:5432/meridian_prod"
}
```

---

## Generated Sprawl Design

The core ~40 endpoints represent what was intentionally built. But API Shield discovery will find far more because:

### Path Variable Explosions

Every request with a unique ID in the path appears as a separate "endpoint" in discovery. For the mobile banking endpoints alone:

```
/api/v3/accounts/ACC-12345
/api/v3/accounts/ACC-12346
/api/v3/accounts/ACC-12347
/api/v3/accounts/ACC-12345/transactions/TXN-67890
/api/v3/accounts/ACC-12345/transactions/TXN-67891
/api/v3/accounts/ACC-12346/transactions/TXN-67892
/api/v3/accounts/ACC-12345/transfers/TRF-001
/api/v3/accounts/ACC-12345/balance
```

Each of these appears as a unique discovered endpoint. The security engineer must manually identify that these are all variants of 5 parameterized templates and dismiss the individual instances.

### Version Ghosts

Old API versions still receive residual traffic:
```
/api/v1/accounts          (deprecated but still live)
/api/v2/accounts          (deprecated but still live)
/api/v3/accounts          (current)
```

All three appear in discovery. The engineer doesn't know which is current.

### Microservice Leaks

Internal services that route through Cloudflare:
```
/svc/user-service/api/v1/users
/svc/payment-service/internal/process
/svc/auth-service/validate
/svc/email-service/send
```

### Documentation Endpoints

Left exposed:
```
/swagger.json
/api-docs
/openapi.yaml
/api/v3/docs
```

### Health Checks From Multiple Services

```
/health
/api/v3/health
/svc/user-service/health
/svc/payment-service/health
/internal/health
```

See `sprawl-design.md` for the full generator specification.

---

## The Two Parallel Transfer Flows

This is critical for understanding the sequence mitigation challenge.

### Modern Flow (Mobile Banking)

```
Step 1: POST /api/v3/auth/login                    → Get JWT
Step 2: POST /api/v3/auth/mfa/verify                → Verify MFA code
Step 3: GET  /api/v3/accounts                       → List accounts
Step 4: GET  /api/v3/accounts/{id}/balance          → Check balance
Step 5: POST /api/v3/accounts/{id}/transfers        → Initiate transfer
Step 6: GET  /api/v3/accounts/{id}/transfers/{tid}  → Confirm status
```

### Legacy Flow (Online Portal) -- Same business logic, different APIs

```
Step 1: POST /banking/api/doLogin                   → Get API key
Step 2: GET  /banking/api/getAccounts               → List accounts
Step 3: POST /banking/api/doTransfer                → Transfer (no separate balance check)
Step 4: POST /banking/api/validatePayment           → Validate
```

**The problem:** If you define sequence rules for the modern flow, the legacy flow is unprotected. And vice versa. The security team doesn't know both flows exist until they see them in discovery -- at which point they don't know which is current or whether both need protection.

---

## Sensitive Data Map (All Services)

| Endpoint | Data Type | Sensitivity | Auth Required |
|----------|-----------|-------------|---------------|
| `/partners/v1/kyc/verify` | SSN, tax ID, DOB, address | **Critical** | mTLS + API Key |
| `/cardservices/xmlapi/getCardStatus` | Full card number, expiry | **Critical** | WS-Security |
| `/debug/db-status` | Database connection strings with passwords | **Critical** | **None** |
| `/internal/risk-engine/score/{id}` | Customer risk profiles | **Critical** | **None** |
| `/internal/audit/log` | PII in audit entries | **High** | **None** |
| `/api/v3/accounts/{id}/transactions` | IBANs, amounts, counterparty info | **High** | JWT |
| `/old-portal/user/info` | Legacy user data (potentially plaintext passwords) | **High** | Session cookie |
| `/api/v3/accounts/{id}/balance` | Account balances | **Medium** | JWT |
| `/wm/api/1.0/portfolios/{id}/holdings` | Investment holdings, valuations | **Medium** | Basic Auth |
| `/api/v3/graphql` (POST) | IBANs, balances, transaction data (via queries) | **High** | JWT |
| `/api/v3/graphql` (GET) | Full schema introspection (reveals all types/fields) | **Medium** | **None** |
| `/banking/api/getTransactions` | Account numbers, amounts | **Medium** | API Key |
