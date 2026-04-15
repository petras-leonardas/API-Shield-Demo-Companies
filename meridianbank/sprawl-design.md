# MeridianBank -- Endpoint Sprawl Generator Design

## Purpose

The sprawl generator creates 70-100 additional endpoints on top of MeridianBank's ~40 designed core endpoints. Its job is to simulate the organic, unplanned growth of an enterprise API surface over 12 years -- endpoints built by different teams, at different times, with different conventions, many of which are undocumented or unknown to the central security team.

The goal is to make API Shield's discovery output feel realistically overwhelming -- not just "a lot of endpoints" but "a lot of endpoints that are hard to make sense of."

## Generator Inputs

```javascript
config = {
  // How many additional endpoints to generate
  totalEndpoints: 80,

  // Distribution across sprawl categories
  distribution: {
    pathVariableVariants: 0.30,  // 30% -- different IDs in known paths
    versionGhosts: 0.15,         // 15% -- old/alternative versions
    microserviceLeaks: 0.20,     // 20% -- internal services
    queryParamVariants: 0.10,    // 10% -- same path, different query combos
    documentationEndpoints: 0.05, // 5% -- swagger, api-docs, etc.
    healthChecks: 0.05,          // 5% -- per-service health endpoints
    regionalVariants: 0.05,      // 5% -- /uk/, /eu/ prefixes
    abandoned: 0.10              // 10% -- random old endpoints
  }
}
```

## Sprawl Categories

### 1. Path Variable Variants (30%)

Takes the parameterized core endpoints and generates concrete instances with specific IDs. These are the endpoints that make customers say "I have 6,000 endpoints" when they really have 38 patterns.

**Input template:** `/api/v3/accounts/{account_id}/transactions`

**Generated variants:**
```
/api/v3/accounts/ACC-12345/transactions
/api/v3/accounts/ACC-12346/transactions
/api/v3/accounts/ACC-12347/transactions
/api/v3/accounts/ACC-12345/transactions/TXN-67890
/api/v3/accounts/ACC-12345/transactions/TXN-67891
/api/v3/accounts/ACC-12346/transactions/TXN-67892
```

**ID formats to use (vary by service):**
- Account IDs: `ACC-{5 digits}` (e.g., `ACC-12345`)
- Transaction IDs: `TXN-{5 digits}` (e.g., `TXN-67890`)
- Transfer IDs: `TRF-{3 digits}` (e.g., `TRF-001`)
- Customer IDs: `CUST-{5 digits}` (e.g., `CUST-98765`)
- Payment IDs: `PAY-{uuid-fragment}` (e.g., `PAY-a1b2c3d4`)
- Portfolio IDs: `PF-{3 digits}` (e.g., `PF-001`)
- Card numbers: `4532-XXXX-XXXX-{4 digits}`

### 2. Version Ghosts (15%)

Old API versions that still receive residual traffic. For each modern endpoint, create 1-2 older version equivalents.

**Examples:**
```
# Current: /api/v3/accounts
/api/v1/accounts              # Original version
/api/v2/accounts              # Mid-generation

# Current: /api/v3/accounts/{id}/balance
/api/v1/balance?account={id}  # v1 used query params
/api/v2/accounts/{id}/balance  # v2 existed briefly

# Current: /partners/v1/payments/process
/partners/beta/payments        # Beta version never removed
```

### 3. Microservice Leaks (20%)

Internal microservice endpoints that are routable through Cloudflare. These follow the `/svc/{service-name}/` pattern and represent services that should only be accessible on the internal network.

**Service names to use:**
```
/svc/user-service/api/v1/users
/svc/user-service/api/v1/users/{id}
/svc/user-service/health
/svc/payment-service/internal/process
/svc/payment-service/internal/refund
/svc/payment-service/health
/svc/auth-service/validate
/svc/auth-service/tokens/revoke
/svc/email-service/send
/svc/email-service/templates
/svc/sms-service/send
/svc/fraud-detection/analyze
/svc/fraud-detection/report
/svc/account-service/internal/close
/svc/account-service/internal/freeze
```

**Auth:** None (these were meant to be internal)

### 4. Query Parameter Variants (10%)

Same base path but with different query parameter combinations. Discovery may treat these as different endpoints depending on how parameters are handled.

**Examples:**
```
/banking/api/getTransactions?accountId=ACC-12345
/banking/api/getTransactions?accountId=ACC-12345&from=2024-01-01
/banking/api/getTransactions?accountId=ACC-12345&from=2024-01-01&to=2024-06-30
/banking/api/getTransactions?accountId=ACC-12345&limit=100
/internal/audit/log?from=2024-01-01&to=2024-12-31
/internal/audit/log?from=2024-06-01&to=2024-06-30
/internal/audit/log?from=2024-11-01
```

### 5. Documentation Endpoints (5%)

API documentation and spec files left exposed on various services. Includes the GraphQL Playground that was never disabled in production.

```
/swagger.json
/swagger-ui/
/api-docs
/api-docs/v3
/openapi.yaml
/api/v3/docs
/api/v3/graphql           (GET -- serves GraphQL Playground UI, no auth)
/banking/api/docs
/partners/docs/swagger.json
/wm/api/1.0/docs
```

### 6. Health Checks From Multiple Services (5%)

Every microservice has its own health/readiness endpoint.

```
/health
/healthz
/ready
/api/v3/health
/banking/api/health
/partners/health
/svc/user-service/health
/svc/payment-service/health
/svc/auth-service/health
/svc/email-service/health
/wm/api/1.0/health
```

### 7. Regional Variants (5%)

Some endpoints have region-specific prefixes from a regionalization effort that was never completed.

```
/uk/api/v3/accounts
/eu/api/v3/accounts
/uk/banking/api/getAccounts
/de/partners/v1/rates/exchange
```

### 8. Abandoned Endpoints (10%)

Random old endpoints from projects that were started and never finished, or features that were deprecated but never removed.

```
/api/v0/prototype/users
/staging/api/accounts
/test/api/v3/accounts
/legacy/soap-bridge/accounts
/mobile-v1/auth/login
/mobile-v1/accounts
/admin/api/users
/admin/api/settings
/backoffice/reports/daily
/backoffice/reports/monthly
```

## Generator Output

The generator should:

1. **Create Express routes dynamically.** Read the config, generate the specified number of endpoints across categories, and register them as Express routes.
2. **Return realistic responses.** Each generated endpoint should return a plausible JSON response (or 404/403 for some deprecated endpoints).
3. **Vary response characteristics:**
   - Some return 200 with data
   - Some return 301/302 redirects (old versions redirecting to new)
   - Some return 404 (truly abandoned)
   - Some return 500 (broken legacy endpoints)
   - Internal services return 200 with sensitive data
4. **Be configurable.** The total count and category distribution should be adjustable so you can dial the sprawl up or down.

## Expected Discovery Impact

With ~40 core + 80 generated + path variable explosions from traffic, API Shield discovery should show approximately:

| Category | Estimated Count |
|----------|----------------|
| Core endpoints (parameterized) | ~40 |
| Path variable instances | ~30-40 |
| Version ghosts | ~12 |
| Microservice leaks | ~16 |
| Query param variants | ~8 |
| Documentation endpoints | ~4 |
| Health checks | ~4 |
| Regional variants | ~4 |
| Abandoned endpoints | ~8 |
| **Total in discovery** | **~150-180** |

This creates the flat, un-prioritized list that defines the discovery plateau experience.
