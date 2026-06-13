# Session Identifiers

## The wristband at the door

Imagine you run a music festival. Thousands of people stream through the gates, walk between stages, buy food, use restrooms. You can see the crowd, but you have no idea who's who. Is the person buying their fifth beer the same person who bought the first, or are five different people buying one each?

Now give every attendee a wristband -- a unique band that stays on all weekend. Suddenly you can track patterns. How often does someone visit the food court? Is anyone hitting every ATM in sequence? Is the person trying to get backstage the same one who was turned away ten minutes ago?

That wristband is a session identifier. For API Shield, it is the single piece of configuration that unlocks -- or permanently blocks -- the product's most powerful security features.

## What a "session" actually is

When someone uses an API, they don't send one request. They send a series: logging in, browsing products, adding to a cart, checking out. That series of requests from one user is a session. But HTTP -- the protocol powering the web -- doesn't natively know about sessions. Every request arrives at Cloudflare as an independent event. There is no built-in way to look at two requests and say "these came from the same person."

A session identifier is a piece of data inside each request that tells Cloudflare which user sent it. It ties individual requests into a coherent story about one user's behavior over time.

## Three types, one choice

Cloudflare supports three kinds of session identifier, each based on where the identifying information lives in the request.

**HTTP header** is the most common. Many APIs require an `Authorization` header carrying a token that proves the user's identity. You tell Cloudflare: group all requests with the same value in this header.

**Cookie** covers APIs that use browser cookies for session tracking. The server sets a cookie on the first request, and the browser sends it back with every subsequent one.

**JSON Web Token (JWT) claim** is the most precise option. A JWT is a structured token containing fields -- called "claims" -- like user ID, email, and expiry time. Because JWTs rotate (a token issued at 10:00 might expire at 10:15, replaced by a fresh one), using the full `Authorization` header treats each new token as a new session even though the user hasn't changed. Using a stable claim like `sub` (short for "subject," typically the user ID) ties the whole session together regardless of token rotation. The catch: this requires JWT validation to be configured first, so Cloudflare can verify and decode the token before reading its claims.

## What Cloudflare does without being asked

If your API sends the `Authorization` header on more than 1% of successful requests to your zone (a Cloudflare term for a domain and all its subdomains), Cloudflare automatically sets it as the session identifier. This auto-detection is genuinely useful -- companies with a straightforward auth model may never need to touch the session identifier settings at all.

But auto-detection has hard limits. It only recognizes the `Authorization` header specifically. Custom headers like `X-API-Key` or `X-Seller-Key` are invisible to it. And if the same `Authorization` header carries different credential formats on different endpoints -- Bearer tokens on some, Basic Auth on others -- auto-detection sets the header without understanding that distinction.

## What you must configure yourself

The dashboard interaction is simple: Security Settings, filter by API abuse, Session Identifiers, pick a type, enter a name, save. Under a minute.

The hard part is knowing what to type. For headers, you need to know which one your API uses. For cookies, you need the exact name. For JWT claims, you need JWT validation already set up and you need to know which claim uniquely identifies users. These are questions about your own architecture -- Cloudflare cannot answer them for you.

There's a structural limitation too: session identifiers are zone-wide. You can configure multiple identifiers simultaneously (both `Authorization` and `X-API-Key`), but you cannot assign specific identifiers to specific endpoint groups. There is no way to say "use this identifier for these endpoints and that identifier for those."

## What session identifiers unlock

Four features depend entirely on session identifiers. Without them, these features either don't work or produce severely limited results.

**Volumetric Abuse Detection** analyzes per-session traffic to recommend rate limits for each endpoint. It needs at least 50 distinct sessions hitting an endpoint within 24 hours to generate a recommendation. **Sequence Analytics** tracks the order of requests per session, surfacing patterns like login-browse-cart-checkout and scoring them by how strongly the steps correlate. **Sequence Mitigation** enforces those patterns, blocking requests that skip steps in a defined flow. **Authentication Posture** monitors whether endpoints receive authenticated or unauthenticated traffic and flags misconfigurations with labels like `cf-risk-missing-auth`.

This dependency chain is what makes session identifiers so consequential. Get them right, and an entire tier of functionality opens up. Get them wrong, and those features remain permanently unavailable.

## The divide: five minutes vs. forever

CartNova, a four-year-old e-commerce marketplace with 37 endpoints, uses `Authorization: Bearer <JWT>` across its entire authenticated surface. One header, one token format, one issuer. Cloudflare's auto-detection likely handles it without CartNova doing anything. If they want better accuracy, they configure the `sub` JWT claim instead -- their tokens expire every 15 minutes, so using the raw header fragments each user into disconnected 15-minute sessions, while `sub` keeps the user continuous across refreshes. Either way, five minutes of work, full feature set unlocked.

The one wrinkle: CartNova's seller endpoints use `X-Seller-Key` instead of `Authorization`. Auto-detection won't catch this. To get session-based rate limits and sequence tracking for seller traffic, CartNova needs to manually add `X-Seller-Key` as a second identifier.

Contrast that with a more typical enterprise zone — picture a single Cloudflare domain that hosts half a dozen apps alongside each other: a Swagger Petstore API using JWT Bearer, an OWASP Juice Shop with its own custom token, a Grafana instance on session cookies, a Kibana behind basic auth, and an httpbin endpoint with no auth at all. This is the shape of Emmanuel Francis's demo lab, and it is also the shape of most real enterprise deployments. When the security team opens the configuration screen, they face a question they genuinely cannot answer: "Which header identifies a session?"

If they configure `Authorization`, they cover the Petstore's JWTs and Kibana's Basic Auth — two fundamentally different credential types lumped under the same header name. Juice Shop, Grafana, and the unauthenticated httpbin traffic remain invisible. Rate limiting recommendations will be incomplete. Sequence Analytics will miss cross-service flows. Authentication Posture may flag endpoints as "missing auth" when they are authenticated — just not via the configured identifier.

## Where the product falls short

Several API security vendors take a different approach. Salt Security and Traceable AI analyze traffic to automatically identify session tokens without manual configuration, observing which header values correlate with user-level request patterns and proposing identifiers per endpoint group. They also support per-path session identifier mapping, not just zone-wide configuration.

42Crunch and Kong integrate session awareness directly into their gateway layer, making per-route decisions. Cloudflare's approach -- manual, declarative, zone-wide -- is simpler and works well for APIs with consistent auth. But the gap disproportionately affects exactly the customers who need the most help: enterprises with fragmented authentication across multiple teams and technology eras.

## The bottom line

Session identifiers are technically a one-minute configuration: one dropdown, one text field, one save button. But they require knowing how your APIs authenticate users, which requires having a relationship with the teams that built those APIs. For companies like CartNova with unified auth, the answer is common knowledge and the setup is invisible. For enterprises running half a dozen apps under one zone, each with its own auth mechanism and its own owner team, the configuration screen could be the most elegant interface ever designed and it wouldn't change the fact that the security team doesn't know what to type into it. The difficulty isn't in the product -- it's in the prerequisites.

---

### The vocabulary, summarised

| Term | What it means |
|------|---------------|
| Session | A series of API requests from one user over time -- from login through whatever they do until they leave. |
| Session identifier | The specific piece of data in a request (a header, cookie, or JWT claim) that tells Cloudflare which user sent it. |
| JWT (JSON Web Token) | A structured token carrying user identity information. It contains fields like user ID, email, and expiry time, and is cryptographically signed so it can't be tampered with. |
| Claim | A named field inside a JWT. Common claims include `sub` (subject/user ID), `email`, `iss` (issuer), and `exp` (expiry). |
| Token Configuration | A setup in API Shield where you upload your JWT issuer's public keys so Cloudflare can verify and decode JWTs. Required before using JWT claims as session identifiers. |
| Zone | In Cloudflare, a domain and all its subdomains. Session identifiers are configured at the zone level, meaning they apply to all traffic on the domain. |
| Volumetric Abuse Detection | API Shield's feature that analyzes per-session traffic to recommend rate limits for each endpoint. |
| Sequence Analytics | API Shield's feature that tracks the order of requests per session and surfaces common navigation patterns. |
| Sequence Mitigation | API Shield's feature that enforces request ordering rules, blocking users who skip steps in a defined flow. |
| Authentication Posture | API Shield's feature that monitors whether endpoints receive authenticated or unauthenticated traffic, flagging misconfigurations. |
| Auto-detection | Cloudflare's behavior of automatically setting the `Authorization` header as a session identifier when it appears on more than 1% of successful requests. |
| Precedence score | The metric Sequence Analytics uses to rank how strongly requests in a sequence correlate -- higher scores mean the steps almost always occur together in that order. |

### Questions worth asking customers

**"Can you tell me right now which header or token uniquely identifies a user across your API traffic?"**
*If they answer instantly, session identifiers will be trivial. If they hesitate or say "it depends," every session-dependent feature is at risk of stalling.*

**"How many different authentication mechanisms do your APIs use?"**
*One mechanism means one identifier and full coverage. Multiple mechanisms means partial coverage and blind spots in rate limiting, sequences, and auth posture.*

**"Do your tokens rotate, and if so, how often?"**
*Short-lived tokens (15-minute expiry is common) fragment sessions when using the raw header. This surfaces whether the JWT claim option -- and its JWT validation prerequisite -- is needed.*

**"Is the team that manages Cloudflare the same team that built the API?"**
*Same team means instant answers to every configuration question. Different teams means cross-team coordination, delays, and the risk of stalling entirely.*

**"Have you already set up JWT validation in API Shield?"**
*JWT claims are the best identifier for JWT-based APIs, but they require Token Configurations as a prerequisite. If JWT validation isn't set up, the dependency chain may delay everything.*

**"After configuring session identifiers, did rate limit recommendations appear within 24 hours?"**
*If yes, the identifier is working and the endpoint has sufficient traffic. If no, either the identifier is misconfigured, the endpoint lacks the minimum 50 distinct sessions, or the identifier doesn't match what Cloudflare expects.*

**"Are there parts of your API surface you know aren't covered by your current session identifiers?"**
*Surfaces awareness of coverage gaps. Customers who know their gaps can make tradeoffs. Customers who don't know are getting misleading data without realizing it.*

**"If you could only protect one API flow with session-based features, which would it be?"**
*A triage question for enterprise customers. Rather than solving session identifiers for the whole surface, focusing on one high-value flow lets them experience the downstream features and build momentum.*
