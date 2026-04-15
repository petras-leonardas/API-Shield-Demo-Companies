# MeridianBank -- Traffic Plan

## Overview

Traffic generation for MeridianBank simulates the messy reality of a 12-year-old enterprise: multiple teams' APIs running simultaneously, legacy systems still receiving traffic, internal services accidentally exposed, and residual traffic on deprecated endpoints. Six scripted journeys cover the different eras of the bank's API surface, plus attack patterns.

All traffic flows through Cloudflare so API Shield discovery can observe it -- and produce the overwhelming, flat, un-prioritized list that characterizes the discovery plateau.

---

## Journey 1: Modern Mobile Banking (JWT Auth)

**Purpose:** The "good" traffic. Clean, modern flow that represents what the mobile team built in 2022.

**Auth:** JWT Bearer token

**Flow:**
```
1. POST /api/v3/auth/login                              → Authenticate
2. POST /api/v3/auth/mfa/verify                          → MFA verification
3. GET  /api/v3/accounts                                 → List accounts
4. GET  /api/v3/accounts/{account_id}/balance            → Check balance
5. POST /api/v3/accounts/{account_id}/transfers          → Initiate transfer
6. GET  /api/v3/accounts/{account_id}/transfers/{tid}    → Check transfer status
```

**Variations:**
- 10-20 different account IDs (generates path variable explosions in discovery)
- 5-10 different transfer IDs per account
- Some sessions are balance-check only (steps 1-4)
- Some sessions browse transactions: `GET /api/v3/accounts/{id}/transactions`

**Volume:** 100-200 requests per hour

**Key for testing:** This is the only flow clean enough to realistically set up sequence rules for. But even here, the path variable variants will clutter discovery.

---

## Journey 2: Legacy Portal Traffic (API Key Auth)

**Purpose:** Keeps the old online banking portal APIs alive. Same business logic as Journey 1, completely different endpoints.

**Auth:** `X-API-Key` header

**Flow:**
```
1. POST /banking/api/doLogin                             → Get API key
2. GET  /banking/api/getAccounts                         → List accounts
3. GET  /banking/api/getTransactions?accountId={id}      → View transactions
4. POST /banking/api/doTransfer                          → Transfer money
5. POST /banking/api/validatePayment                     → Validate
```

**Variations:**
- 5-10 different account IDs in query parameters
- Different transfer amounts

**Volume:** 50-100 requests per hour (lower than mobile, but consistent)

**Key for testing:** Discovery finds both this and Journey 1. The security engineer sees two sets of account/transfer endpoints with completely different naming and auth. They don't know which is current. This is the "who owns this?" moment.

---

## Journey 3: Partner Payment Processing (mTLS + API Key)

**Purpose:** B2B API traffic from external partners.

**Auth:** mTLS client certificate + `X-Partner-Key` header

**Flow:**
```
1. POST /partners/v1/payments/process                    → Process payment
2. GET  /partners/v1/payments/{payment_id}/status        → Check status
3. POST /partners/v1/kyc/verify                          → KYC check
4. GET  /partners/v1/rates/exchange                      → Get FX rates
```

**Also generates traffic on v2:**
```
5. POST /partners/v2/payments/initiate                   → Newer payment flow
```

**Variations:**
- 3 different partner keys (simulating different B2B partners)
- Different payment amounts and currencies
- KYC verifications with different customer data (SSNs, tax IDs)

**Volume:** 30-50 requests per hour

**Key for testing:** Two versions of payment APIs (`v1/payments/process` and `v2/payments/initiate`) appear in discovery. The security team doesn't know the difference. KYC responses contain critical PII (SSN, tax ID) -- sensitive data detection should flag these.

---

## Journey 4: Internal Service Leaks (NO Auth)

**Purpose:** Simulates internal microservice traffic that's accidentally routable through the public internet. This is the scariest traffic pattern.

**Auth:** None

**Flow:**
```
1. GET  /internal/risk-engine/score/{customer_id}        → Risk scoring
2. POST /internal/compliance/check                       → Compliance check
3. GET  /internal/audit/log?from={date}&to={date}        → Audit logs
4. GET  /svc/notification/templates                      → Notification templates
5. POST /svc/notification/send                           → Send notification
6. GET  /health                                          → Health check
7. GET  /metrics                                         → Prometheus metrics
```

**Variations:**
- 10-20 different customer IDs in risk scoring (generates path variable sprawl)
- Different date ranges for audit logs
- Different notification types

**Volume:** 20-40 requests per hour

**Key for testing:** These endpoints appear in discovery with no auth, alongside all the authenticated endpoints. Discovery doesn't distinguish "this is internal and shouldn't be here" from "this is a public API." Sensitive data detection should flag risk scores and audit logs.

---

## Journey 5: Shadow/Deprecated Traffic (Residual)

**Purpose:** Generates low-volume traffic on endpoints that were "decommissioned" but never actually removed. This is the kind of traffic that makes the discovery output messy and hard to interpret.

**Auth:** Various (old JWT format, session cookie, none)

**Flow:**
```
1. GET  /api/v1/accounts                                 → Old API version
2. GET  /api/v2/accounts                                 → Mid-generation version
3. GET  /old-portal/user/info                            → Legacy portal
4. POST /test/transfer                                   → Test endpoint in prod
5. GET  /debug/db-status                                 → Debug endpoint (!!!)
```

**Volume:** Very low -- 5-20 requests per hour total. Just enough to appear in discovery.

**Key for testing:** These are the endpoints that make the security engineer ask "what is this?" Discovery shows them alongside production endpoints. `/debug/db-status` is the most critical -- it exposes database connection strings with passwords and has no authentication.

---

## Journey 6: Wealth Management (Basic Auth)

**Purpose:** Traffic from the acquired wealth management platform.

**Auth:** Basic Auth (`Authorization: Basic <base64>`)

**Flow:**
```
1. GET  /wm/api/1.0/portfolios                           → List portfolios
2. GET  /wm/api/1.0/portfolios/{id}/holdings              → View holdings
3. POST /wm/api/1.0/portfolios/{id}/rebalance             → Rebalance
4. GET  /wm/api/1.0/market-data/quotes/{symbol}          → Market data
```

**Variations:**
- 5 different portfolio IDs
- 10-20 different stock symbols (AAPL, MSFT, GOOGL, etc.)

**Volume:** 20-30 requests per hour

**Key for testing:** Yet another auth mechanism (Basic Auth) and URL convention (`1.0` vs `v1` vs `v3`). In discovery, these appear alongside everything else with no indication that they came from an acquired company.

---

## Journey 7: GraphQL Gateway (JWT Auth)

**Purpose:** Traffic to the experimental GraphQL endpoint built during the 2023 microservices refactor. Exercises the only GraphQL surface in either company -- required for testing GraphQL Query Protection.

**Auth:** JWT Bearer token (same as mobile banking)

**Flow:**
```
1. POST /api/v3/auth/login                               → Authenticate (reuse mobile banking login)
2. POST /api/v3/graphql                                   → Simple accounts query
3. POST /api/v3/graphql                                   → Account detail with nested transactions
4. POST /api/v3/graphql                                   → Transfer mutation
5. GET  /api/v3/graphql                                   → GraphQL Playground (no auth, browser hit)
```

**Sample queries sent:**
```graphql
# Step 2: Simple list
query { accounts { id balance currency } }

# Step 3: Nested query (moderate depth)
query { account(id: "ACC-12345") { balance transactions(limit: 5) { id amount description } } }

# Step 4: Mutation
mutation { initiateTransfer(fromAccount: "ACC-12345", toIban: "DE89370400440532013000", amount: 100.00, currency: "EUR") { transferId status } }
```

**Variations:**
- Different account IDs in queries
- Different nesting depths (some shallow, some 3-4 levels deep)
- Some sessions only query, some also mutate
- Occasional introspection queries (`{ __schema { types { name } } }`)

**Volume:** 15-25 requests per hour (low -- it's an experimental endpoint)

**Key for testing:** This is the only endpoint where GraphQL Query Protection can be tested. Normal traffic establishes a baseline; attack patterns (below) test depth and size limits. The GET endpoint (Playground) adds an unauthenticated entry to discovery, and should be flagged by Authentication Posture.

---

## Attack Patterns

### 6a: BOLA on Account Enumeration
```
# Enumerate account IDs sequentially
GET /api/v3/accounts/ACC-00001
GET /api/v3/accounts/ACC-00002
GET /api/v3/accounts/ACC-00003
... (iterate through 100+ IDs)
```
**Tests:** BOLA detection, rate limiting (if session identifiers are configured)

### 6b: MFA Bypass
```
POST /api/v3/auth/login                → Get JWT
GET  /api/v3/accounts                  → Skip MFA, go directly to accounts
```
**Tests:** Sequence mitigation -- accounts should require MFA step first

### 6c: Unauthenticated Internal Access
```
# Access critical internal endpoints from public internet
GET  /internal/risk-engine/score/CUST-98765
GET  /internal/audit/log?from=2024-01-01&to=2024-12-31
GET  /debug/db-status
POST /internal/compliance/check
```
**Tests:** Discovery should surface these as unprotected. Sensitive data detection should flag responses.

### 6d: Auth Confusion
```
# Use JWT token against API-key-only endpoints
GET /banking/api/getAccounts  (with JWT instead of X-API-Key)

# Use API key against JWT-only endpoints
GET /api/v3/accounts  (with X-API-Key instead of JWT)
```
**Tests:** Schema validation (wrong auth header format)

### 6e: Transfer Without Balance Check (Sequence Skip)
```
POST /api/v3/auth/login
POST /api/v3/auth/mfa/verify
POST /api/v3/accounts/{id}/transfers    → Skip balance check, go straight to transfer
```
**Tests:** Sequence mitigation

### 6f: GraphQL Depth Attack
```
# Deeply nested query (depth 20+) designed to overwhelm resolvers
POST /api/v3/graphql
{
  "query": "{ accounts { transactions { account { transactions { account { transactions { account { transactions { id } } } } } } } } }"
}
```
**Tests:** GraphQL Query Protection depth limit. Should be blocked if depth limit is set to 10.

### 6g: GraphQL Size Attack
```
# Excessively large query (requesting every field, repeated aliases)
POST /api/v3/graphql
{
  "query": "{ a1: accounts { id balance currency transactions { id date amount description counterpartyIban } } a2: accounts { id balance currency transactions { id date amount description counterpartyIban } } ... (50+ aliases) }"
}
```
**Tests:** GraphQL Query Protection size limit. Should be blocked if size limit is set to 10KB.

### 6h: GraphQL Introspection Abuse
```
# Full schema introspection (reveals all types, fields, mutations)
POST /api/v3/graphql
{
  "query": "{ __schema { queryType { name } mutationType { name } types { name kind fields { name type { name kind ofType { name } } } } } }"
}
```
**Tests:** Whether introspection should be disabled or restricted. Reveals the entire API surface through a single query.

### 6i: Cross-Flow Confusion
```
# Start in modern flow, finish in legacy flow
POST /api/v3/auth/login                 → Modern login
GET  /banking/api/getAccounts           → Legacy account list
POST /banking/api/doTransfer            → Legacy transfer
```
**Tests:** An edge case that probably won't be caught by sequence rules -- illustrating the limitation of parallel, uncoordinated API surfaces.

### 6j: GraphQL + REST Cross-Flow
```
# Authenticate via REST, query via GraphQL, transfer via legacy
POST /api/v3/auth/login                 → Get JWT
POST /api/v3/graphql                    → Query account balances via GraphQL
POST /banking/api/doTransfer            → Transfer via legacy portal
```
**Tests:** Sequence detection across REST and GraphQL boundaries. The GraphQL query and the legacy transfer serve the same business purpose (check balance, transfer money) but through completely different API styles.

---

## Traffic Runner Configuration

```
Runner config:
  - base_url: https://banking.meridianbank.example.com
  - journeys:
      modern_banking:   { concurrency: 10, interval: "15s"  }
      legacy_portal:    { concurrency: 5,  interval: "30s"  }
      partner_payments: { concurrency: 3,  interval: "60s"  }
      internal_leaks:   { concurrency: 2,  interval: "90s"  }
      shadow_traffic:   { concurrency: 1,  interval: "300s" }
      wealth_mgmt:      { concurrency: 2,  interval: "120s" }
      graphql_gateway:  { concurrency: 2,  interval: "120s" }
      attacks:          { enabled: false, run_once: true }
  - duration: "2h" (longer than CartNova -- need more traffic for discovery to find everything)
  - logging: true
```

## Expected Discovery Output

After running all journeys for 2+ hours, API Shield discovery should show:

- ~38 core endpoint patterns (but many will appear as individual path-variable variants)
- ~70-100 additional sprawl endpoints (from the generator)
- Path variable explosions adding dozens more entries
- Total visible: **150-200+ line items** in the discovery list
- No grouping by team, service, or auth type
- No traffic volume indicators
- No risk signals
- A flat, alphabetically sorted wall of endpoints

This is the discovery plateau.
