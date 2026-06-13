# API Shield Features & Customer Journey

> **Source of truth:** `developers.cloudflare.com/api-shield/` (fetched April 2026)
> **Purpose:** Underpin the FigJam dependency-graph visualization. Every node and edge in the FigJam should map back to a row in this file.
> **Companion artefact:** see the FigJam diagram URL in `cartnova/lab/` (forthcoming) once generated.

---

## How to read this file

Each feature is captured with four primary attributes:

- **What it does** -- one-sentence functional description from the docs.
- **Prerequisites** -- features or configurations that must exist *before* this one will work. Empty list = standalone.
- **Enables** -- features that gain power once this one is in place. Used to draw the downstream edges in the dependency graph.
- **Auto / Manual** -- whether Cloudflare provides a default behaviour without configuration, or whether the customer must explicitly set it up.

A fifth column captures notable caveats and "stuck points" that are worth flagging in research conversations.

---

## The foundational feature

### Session Identifiers

| Attribute | Value |
|---|---|
| **What it does** | Tells Cloudflare how to recognise a single API client across many requests. Can be a cookie, an HTTP header, or a JWT claim. |
| **Prerequisites** | None (zone on Cloudflare). |
| **Enables** | API Discovery (session-ID-based path), Sequence Analytics, Sequence Mitigation, Authentication Posture, Volumetric Abuse Detection, BOLA vulnerability detection, JWT-claim rate limiting. |
| **Auto / Manual** | **Both.** Cloudflare auto-promotes the `Authorization` header as a session identifier if it appears on >1% of successful requests to the zone. Anything else (cookies, custom headers, JWT claims) is manual. |
| **Caveat** | The auto-promotion is the single most important "you didn't have to do anything" moment in the journey. JWT-claim identifiers specifically require a Token Configuration (see JWT Validation) to exist first -- this is a hidden prerequisite. |

> **Why this is the foundation:** every downstream analytics feature uses session identifiers to attribute requests to a session. Without them, "per-session rate limit" and "this user enumerated 1,000 IDs" aren't computable.

---

## Discovery & management

### API Discovery

| Attribute | Value |
|---|---|
| **What it does** | Builds a map of API endpoints (host, method, path) by inspecting traffic. Two parallel discovery methods: session-ID-based and machine-learning-based. |
| **Prerequisites** | For session-ID-based discovery: Session Identifiers configured. For ML-based discovery: nothing extra -- works on raw traffic. Endpoint must receive >=500 successful 2xx requests in 10 days. |
| **Enables** | Endpoint Management (by promoting endpoints from the Discovery inbox). |
| **Auto / Manual** | **Auto** -- runs continuously on traffic. Surfacing endpoints into the Discovery inbox is automatic. **Saving** them into Endpoint Management is manual. |
| **Caveat** | This is the "discovery plateau" Nuno's research identified. Endpoints sit in the inbox until someone clicks Save. ML discovery works without session identifiers but session-ID discovery is more accurate; both run in parallel and may surface the same endpoints. |

### Endpoint Management

| Attribute | Value |
|---|---|
| **What it does** | The catalog of endpoints Cloudflare actively tracks. Holds host/method/path tuples, performance metrics, labels, and is the gate that unlocks most other features. |
| **Prerequisites** | An endpoint to save. Reaches Endpoint Management via three paths: Discovery (save), Schema validation (auto-add on schema upload), or manual entry. |
| **Enables** | **The single biggest gate in the product.** Schema validation, Schema learning, JWT validation, Sequence Analytics, Sequence Mitigation, Volumetric Abuse Detection (rate-limit recommendations), API Routing, Endpoint Labels, Authentication Posture, BOLA vulnerability detection, Sensitive Data Detection. |
| **Auto / Manual** | **Manual** for Discovery -> Endpoint Management (explicit Save). **Auto** when uploading a schema to Schema validation (endpoints auto-added). |
| **Caveat** | Until an endpoint is saved here, every analytics, validation, and mitigation feature ignores it. This is the single most important sentence to put in the FigJam: "no endpoint, no protection." Emmanuel flagged this multiple times during his demo. |

### Schema learning

| Attribute | Value |
|---|---|
| **What it does** | Cloudflare infers an OpenAPI 3.0 schema from observed traffic on saved endpoints. Exportable as JSON. |
| **Prerequisites** | Endpoints saved in Endpoint Management for at least 24 hours. Higher accuracy with >10,000 requests in last 72 hours. Only learns from `2xx` responses. |
| **Enables** | Schema validation (the learned schema can be applied as the validation source). Vulnerability Scanner (uses the learned schema as input). Developer Portal (can be built from a learned schema). |
| **Auto / Manual** | **Auto** -- continuous learning runs on every saved endpoint. Manual export when you want the file. |
| **Caveat** | Learning starts only after 24 hours and 72-hour rolling window. Customers expecting instant schemas are disappointed. Adds the `cf-risk-missing-schema` label automatically when a learned schema exists for an endpoint with no active schema. |

### Endpoint Labeling Service

| Attribute | Value |
|---|---|
| **What it does** | Tags endpoints with managed labels (e.g. `cf-log-in`, `cf-purchase`) and risk labels (e.g. `cf-risk-bola-enumeration`, `cf-risk-missing-auth`). User-defined labels also supported. |
| **Prerequisites** | Endpoint Management (endpoints must be saved). Risk labels also require Session Identifiers for the auth-related ones. |
| **Enables** | Filtering and bulk-action workflows in Endpoint Management. Risk-driven prioritization (which endpoints need a rule first). Security Center Insights for risks. |
| **Auto / Manual** | **Both.** Risk labels (`cf-risk-*`) are added automatically by 24-hour scans. Managed labels (`cf-log-in`, etc.) are manual today; the docs say they will become automatic in a future release. User-defined labels are manual. |
| **Caveat** | Labels are how customers find the BOLA-vulnerable endpoints, the missing-auth endpoints, the zombie endpoints (`cf-risk-zombie` -- 32-day no-traffic). They're a navigation tool, not just metadata. |

### Sensitive Data Detection

| Attribute | Value |
|---|---|
| **What it does** | Flags endpoints whose responses contain PII (SSNs, credit card numbers, etc.) using the WAF's Sensitive Data Detection ruleset. Surfaces matches as the `cf-risk-sensitive` label. |
| **Prerequisites** | Endpoint Management. Separate Sensitive Data Detection ruleset subscription (Enterprise Advanced plan). |
| **Enables** | Risk-prioritized rule-creation (combine `cf-risk-sensitive` with `cf-risk-missing-auth` to find the most dangerous endpoints first). |
| **Auto / Manual** | **Auto** once the SDD ruleset is enabled on the zone. |
| **Caveat** | This is one of the few features that requires a separate add-on; not all API Shield customers have it. |

---

## Posture management

### Authentication Posture

| Attribute | Value |
|---|---|
| **What it does** | Tells you whether successful requests to your endpoints are authenticated. Labels endpoints `cf-risk-missing-auth` (none authenticated) or `cf-risk-mixed-auth` (some authenticated). |
| **Prerequisites** | Session Identifiers configured. Endpoint Management. |
| **Enables** | Security Center Insights for broken-authentication risks. The signal customers use to write a custom rule blocking unauthenticated access (using `cf.api_gateway.auth_id_present`). |
| **Auto / Manual** | **Auto** -- continuous scan, daily labeling. |
| **Caveat** | Only counts successful (2xx) responses. The accuracy depends entirely on the customer correctly identifying their session identifier. Misconfigured session ID -> misleading posture. Emmanuel flagged this as a research finding during his demo. |

### BOLA Vulnerability Detection

| Attribute | Value |
|---|---|
| **What it does** | Detects two BOLA attack signals: parameter pollution (same parameter in path AND query) and enumeration (one session requests far more unique IDs than peers). Labels endpoints `cf-risk-bola-enumeration` or `cf-risk-bola-pollution`. |
| **Prerequisites** | Session Identifiers (to attribute requests to sessions). Endpoint Management. Endpoint must have seen at least 10,000 sessions for enumeration detection. |
| **Enables** | Security Overview / Insights surfacing. CSV export of attacker IPs and JA4 fingerprints. Manual rule creation to block detected attackers. |
| **Auto / Manual** | **Auto** -- runs continuously once prerequisites are met. |
| **Caveat** | High traffic threshold (10,000 sessions) means low-volume endpoints never get the label even if they have BOLA bugs. Vulnerability Scanner (below) is the active complement. |

### Vulnerability Scanner

| Attribute | Value |
|---|---|
| **What it does** | Actively probes your API for BOLA vulnerabilities using two sets of credentials (Owner, Attacker) and a customer-supplied OpenAPI schema. Currently API-only (no dashboard UI yet). |
| **Prerequisites** | OpenAPI schema (uploaded or learned). Two real credential sets in the API. API token with API Gateway:Edit. |
| **Enables** | Active vulnerability reports independent of live traffic. Can be re-run on demand (e.g. after deploys). |
| **Auto / Manual** | **Manual** -- explicit scan invocation. |
| **Caveat** | Open beta, schema size limit ~40-60kB (128k AI context). API-driven only -- no dashboard UI yet, which is a notable gap for non-technical security teams. |

### Mutual TLS (mTLS)

| Attribute | Value |
|---|---|
| **What it does** | Requires the client to present a certificate during the TLS handshake. Useful for IoT, B2B partner APIs. Cloudflare hosts the CA or you bring your own. |
| **Prerequisites** | None for the Cloudflare-managed CA path (works on any plan). For BYO CA, you need an Enterprise plan. |
| **Enables** | API Shield rules can require a valid client cert as a precondition. Sequence Mitigation can layer on top. |
| **Auto / Manual** | **Manual** -- requires deliberate cert-issuance and rule-config work. |
| **Caveat** | Only API Shield feature available on every plan (with the managed CA). The certificate-distribution problem is the customer's, not Cloudflare's -- a real adoption blocker. |

### GraphQL Query Protection

| Attribute | Value |
|---|---|
| **What it does** | Inspects POSTed GraphQL queries and blocks ones above configured query-depth or size thresholds. Prevents DoS via deeply-nested or huge queries. |
| **Prerequisites** | None beyond the API Shield subscription. (Indirectly: useful only if the origin actually serves GraphQL.) |
| **Enables** | Defence against Unrestricted Resource Consumption (OWASP API4) for GraphQL APIs specifically. |
| **Auto / Manual** | **Manual** -- you define the depth/size rules. |
| **Caveat** | Limited: parses up to 20kB POST bodies, paths ending in `/graphql` only, no fragment/multi-operation support. Easy to miss for customers whose GraphQL endpoint lives at a different path. |

---

## Runtime protection

### Schema Validation

| Attribute | Value |
|---|---|
| **What it does** | Validates incoming requests against an OpenAPI 3.0 schema (uploaded or learned). Non-compliant requests are logged or blocked. |
| **Prerequisites** | Endpoint Management (endpoints must be saved -- uploading a schema auto-saves them). A schema (uploaded OR learned). OpenAPI v3.0.x; v3.1 not supported. |
| **Enables** | Fallthrough rules (catch-all for requests outside the saved schema). Defence against Broken Object Property Level Authorization, Server-Side Request Forgery, Security Misconfiguration. |
| **Auto / Manual** | **Manual** for the schema upload. **Auto** for the rule generation -- rules are generated from the schema definitions automatically. |
| **Caveat** | Body inspection limited to `application/json` and to plan-tier byte limits (1KB Free / 8KB Pro+Business / 128KB Enterprise). 10,000 operation cap per zone for Enterprise. Available on **all plans**, not Enterprise-only. |

### JWT Validation

| Attribute | Value |
|---|---|
| **What it does** | Verifies JWTs at the Cloudflare edge using uploaded JWKS public keys. Blocks expired, tampered, or missing tokens. Two-part config: Token Configuration (the keys) + Validation Rule (which endpoints to check). |
| **Prerequisites** | Endpoint Management (endpoints must be saved). JWKS public keys from the customer's identity provider. |
| **Enables** | Session Identifier of type "JWT Claim" (which itself enables session-ID-based rate limiting per user, per tier). Sequence Mitigation when scoped to authenticated flows. Rate limiting by JWT claim. |
| **Auto / Manual** | **Manual.** Both the Token Configuration upload and the Validation Rule are explicit. |
| **Caveat** | Token Configurations live under Security Settings ("API abuse" filter); Validation Rules live under Security Rules. Emmanuel called this UX split out as a real customer pain point. Auto-keep-fresh JWKS is a Worker-based pattern -- manual to set up. JWT-in-POST-body is unsupported; only headers and cookies. |

### Sequence Mitigation

| Attribute | Value |
|---|---|
| **What it does** | Enforces request patterns. Either positive (must do A before B) or negative (block known-bad sequence). Sequence rules ride on top of saved endpoints with a 10-request / 10-minute lookback window per session. |
| **Prerequisites** | Session Identifiers (per-session tracking). Endpoint Management (sequences only see saved endpoints). |
| **Enables** | Defence against Unrestricted Access to Sensitive Business Flows (OWASP API6). Combined with Sequence Analytics, the most differentiated feature in API Shield. |
| **Auto / Manual** | **Manual.** You write the sequence rules. Sequence Analytics suggests them; you choose which to enforce. |
| **Caveat** | Closed beta, Enterprise-only. The 10-request / 10-minute windows can be raised by account team. The sequence rule fires only on flows that go through saved endpoints -- a sequence partly through unsaved endpoints is invisible. |

---

## Analytics & monitoring

### Sequence Analytics

| Attribute | Value |
|---|---|
| **What it does** | Tracks ordered sequences of API requests per session. Ranks them by precedence score (how reliably operation B follows operation A). Surfaces high-confidence flows for the customer to confirm with developers. |
| **Prerequisites** | Session Identifiers. Endpoint Management. (Sequence Analytics shows nothing for endpoints not saved.) |
| **Enables** | Sequence Mitigation rule design (you analyze first, then enforce). |
| **Auto / Manual** | **Auto** -- continuously builds sequences from the last 24 hours of traffic. |
| **Caveat** | Sequences max 9 operations. Successively repeated calls are de-duplicated. Empty until both prerequisites are configured -- the empty-state moment is a real customer confusion point Emmanuel demoed. |

### Volumetric Abuse Detection

| Attribute | Value |
|---|---|
| **What it does** | Generates per-endpoint, per-session rate-limit recommendations using unsupervised learning on traffic. Adapts to changing traffic patterns. Surfaces overall threshold + p50/p90/p99 percentiles + confidence level. |
| **Prerequisites** | Session Identifiers. Endpoint Management. >=50 distinct sessions per endpoint per 24-hour period. |
| **Enables** | Advanced Rate Limiting rules (per-session, per-endpoint, optionally per JWT claim). |
| **Auto / Manual** | **Auto** for the recommendations. **Manual** to actually create the rate-limit rule from a recommendation. |
| **Caveat** | Recommendations only -- no automatic enforcement. Customer still has to subscribe to Advanced Rate Limiting and manually create each rule. The "which percentile do I pick?" question is a real UX moment. |

---

## Routing and developer experience

### API Routing

| Attribute | Value |
|---|---|
| **What it does** | Routes requests from a Source Endpoint (in Endpoint Management) to a Target Endpoint (any URL or IP). Used to unify multiple back-end services behind a single external API. |
| **Prerequisites** | Endpoint Management (the Source Endpoint must be saved). |
| **Enables** | Mock-API and BFF (backend-for-frontend) patterns. Migration tooling (route old paths to new origins). |
| **Auto / Manual** | **Manual** -- explicit route creation per endpoint. |
| **Caveat** | Open beta, Enterprise-only. Cannot change HTTP method. Cannot route to a Worker on the same zone. Five-minute network propagation. |

### Developer Portal

| Attribute | Value |
|---|---|
| **What it does** | Generates an interactive API documentation site (Redoc-based) from saved endpoints or an uploaded OpenAPI schema. Hosted on Cloudflare Pages. |
| **Prerequisites** | Endpoint Management, OR an OpenAPI 3.0 schema (uploaded). |
| **Enables** | External-facing API documentation without owning a docs pipeline. Helpful for B2B partner onboarding. |
| **Auto / Manual** | **Manual** -- one-click create-and-deploy after the schema/endpoints are in place. |
| **Caveat** | Generates a Pages project; theme-customisation requires downloading and re-uploading the project files. Enterprise customers get the underlying Pages platform free; lesser plans inherit Pages limits. |

---

## Summary dependency map (text form)

This is the textual outline that becomes the FigJam DAG.

```
[Cloudflare Zone]
        |
        v
[Session Identifiers]                       <-- foundational, partially auto via Authorization header
   |     |                |       |     |
   |     |                |       |     +-> [Authentication Posture]   <-- auto
   |     |                |       +------> [Volumetric Abuse Detection] <-- auto, recommendations only
   |     |                +-------------> [Sequence Analytics]          <-- auto (but also needs endpoints saved)
   |     +----------------------------> [BOLA Vulnerability Detection]  <-- auto, needs >=10K sessions
   +-------------------------------> [API Discovery (session-ID path)]  <-- auto
                                          |
[API Discovery (ML path)]  <-- auto, no session ID needed
                                          |
                                          v
                                  [Endpoint Management]                 <-- manual save
                                          |
        +---------+--------+--------+-----+-----+--------+--------+--------+
        |         |        |        |           |        |        |        |
        v         v        v        v           v        v        v        v
[Schema    [Schema   [JWT      [Sequence   [Sequence  [Routing][Labels  [Sensitive
Learning]  Validation] Validation] Analytics]  Mitigation]            (managed Data
   |        ^             |          |           ^              + risk)] Detection]
   |        |             |          |           |                                       
   v        |             v          |           |
[Dev      [Schema      [Token        [Sequence
 Portal]  upload]      Config        Mitigation
                       (JWKS)]       rules]

[mTLS]    <-- standalone, runs at TLS layer; doesn't depend on anything else
[GraphQL  <-- standalone within API Shield, optional add-on
 Query
 Protection]
[Vulnerability  <-- needs schema + 2 credential sets, API only
 Scanner]
```

---

## Notes on the journey

A few observations that follow from this map but aren't features themselves:

1. **The two doors into Endpoint Management.** Discovery (after-the-fact, traffic-driven) and Schema upload (up-front, design-driven). Digital natives use door 2; enterprises with no schema use door 1. The CartNova/Petstore split in the lab maps onto these two doors.

2. **Two free passes the customer might not notice.**
   - The `Authorization` header auto-becoming a session identifier
   - ML-based Discovery running without any session ID configured at all
   These are the only places where Cloudflare gives you something for nothing. Worth highlighting in the FigJam.

3. **The "must save endpoint" gate is enormous.** Counting features that hide behind it: Schema validation, Schema learning, JWT validation, Sequence Analytics, Sequence Mitigation, Volumetric Abuse Detection, API Routing, Endpoint Labels, Authentication Posture, BOLA detection, Sensitive Data Detection. That's basically every feature except mTLS, GraphQL Protection, the Vulnerability Scanner (which uses an external schema), and Discovery itself. The single most consequential click in the entire product is "Save endpoint."

4. **The ordering Cloudflare's Get Started guide recommends:**
   1. Session Identifiers
   2. (Optional) Schema upload
   3. Sensitive Data Detection ruleset
   4. Save discovered endpoints to Endpoint Management
   5. Wait 24 hours for learning
   6. Add rate limits
   7. Import the learned schema (if started without one)
   8. Sequence Analytics review and Sequence Mitigation rules
   9. JWT validation
   10. GraphQL protection (if applicable)
   11. mTLS (if applicable)

   Worth comparing this to the dependency DAG side-by-side: the recommended order matches the DAG except where it deliberately accepts that some downstream features only become available later. The two visualizations (recommended-journey vs. raw-dependency) are the two views the FigJam should make easy to flip between.

---

## What's intentionally NOT in this list

- **Cloudflare WAF Custom Rules / Rate Limiting Rules** -- adjacent, used by API Shield (e.g. JWT-claim rate limiting is built on Advanced Rate Limiting), but not part of the API Shield feature set.
- **Bot Management** -- frequently paired with API Shield in the OWASP table at the top of the docs index, but it's a separate product.
- **Cloudflare Workers / Pages / R2** -- supporting infrastructure for the Developer Portal and JWKS auto-update Worker, but not features.
- **Cloudflare API itself** -- every feature has an API surface; we capture features, not their API counterparts.
