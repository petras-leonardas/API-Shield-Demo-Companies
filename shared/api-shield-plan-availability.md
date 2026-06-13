# API Shield Plan Availability

> **Source of truth:** `developers.cloudflare.com/api-shield/plans/` plus the per-feature "Availability" sections (fetched April 2026).
> **Purpose:** Underpin the FigJam plan-availability matrix. Captures who-gets-what for the 13 features called out as "API Shield" in the docs index.
> **Companion artefacts:**
>   - Dependency DAG: `https://www.figma.com/board/vGOaV64jycqDpUVmRSlIan`
>   - Feature journey: `shared/api-shield-features-and-journey.md`

---

## What the official Plans page says

> "Free, Pro, Business, and Enterprise customers without an API Shield subscription can access **Endpoint Management** and **Schema validation**, but no other API Shield features."

Endpoint limits scale with plan, but feature availability is binary:

| Plan | Saved endpoints | Uploaded schemas | Schema size | Rule action |
|---|---|---|---|---|
| Free | 100 | 5 | 200 kB | Block only |
| Pro | 250 | 5 | 500 kB | Block only |
| Business | 500 | 10 | 2 MB | Block only |
| Enterprise without API Shield | 500 | 10 | 5 MB | Log or Block |
| Enterprise with API Shield | 10,000 | 10+ | 10+ MB | Log or Block |

That's the surface. The per-feature availability sections add nuance the Plans page glosses over.

---

## Per-feature availability matrix

**Caveat on inconsistency:** the docs are not internally consistent. The Plans page says "no other API Shield features" for non-API-Shield customers, but several individual feature pages call out broader availability (mTLS managed CA on all plans; endpoint labels for all customers). Where the per-feature page is more permissive than the Plans page, I trust the per-feature page -- it's the more recent, more specific source.

| Feature | Free | Pro | Business | Enterprise (no API Shield) | Enterprise + API Shield | Notes |
|---|---|---|---|---|---|---|
| **Schema validation** | ✓ block-only | ✓ block-only | ✓ block-only | ✓ log or block | ✓ log or block, 10K endpoints | "Available on all plans" badge on the docs page; rule action limited on lower tiers. |
| **Endpoint Management** | ✓ 100 endpoints | ✓ 250 | ✓ 500 | ✓ 500 | ✓ 10,000 | The catalog. Labels and metrics ride on top of it. |
| **Endpoint Labels (managed + risk + user-defined)** | ✓ | ✓ | ✓ | ✓ | ✓ | Docs explicitly: "Endpoint labeling is available to all customers." Risk labels (e.g. `cf-risk-zombie`, `cf-risk-sensitive`) are written automatically by 24-hour scans on saved endpoints regardless of plan. The `cf-risk-bola-*` labels still need BOLA detection (Enterprise only) to fire, even though the labeling mechanism exists everywhere. |
| **mTLS (Mutual TLS)** | ✓ Cloudflare-managed CA | ✓ managed CA | ✓ managed CA | ✓ managed CA | ✓ managed CA + BYO CA (up to 5) | The only plan-universal "real" security feature. Higher BYO-CA limits via account team. |
| **API Discovery** | -- | -- | -- | trial only | ✓ | Per-feature page: "only available for Enterprise customers." Trial via "API Shield as a non-contract service" is a 30-day Enterprise-contract-only path. |
| **Schema Learning** | -- | -- | -- | trial only | ✓ | Tied to API Shield subscription. |
| **Sequence Analytics** | -- | -- | trial only | trial only | ✓ | Per-feature page is unusually permissive: "Pro, Business, and Enterprise customers who have not purchased API Shield can get started by enabling the API Shield trial in the Cloudflare dashboard." Free is the only tier with no path. |
| **Volumetric Abuse Detection** | -- | -- | -- | trial only | ✓ recommendations | Recommendations only; enforcement requires Advanced Rate Limiting subscription (a separate add-on). |
| **Authentication Posture** | -- | -- | -- | trial only | ✓ | "Available for all Enterprise customers with an API Shield subscription." |
| **BOLA Vulnerability Detection** | -- | -- | -- | trial only | ✓ | Enterprise-only. Endpoint must have seen >=10K sessions for the enumeration label. |
| **Vulnerability Scanner** | -- | -- | -- | -- | ✓ open beta | Enterprise + API Shield only. No trial path documented. API-only, no dashboard UI yet. |
| **JWT Validation** | -- | -- | trial only | trial only | ✓ | Per-feature page: "available for all API Shield customers. Enterprise customers who have not purchased API Shield can preview API Shield as a non-contract service." So same trial path as Sequence Analytics. |
| **Sequence Mitigation** | -- | -- | -- | -- | ✓ closed beta | Enterprise + API Shield, **and** in closed beta -- account-team-gated even for paid customers. |
| **GraphQL Query Protection** | -- | -- | trial only | trial only | ✓ | Same trial path as JWT and Sequence Analytics. |

Legend: ✓ included, "trial only" = available only via the 30-day API Shield preview (contracted Enterprise customers; per `developers.cloudflare.com/billing/understand/preview-services/`), `--` = not available at all.

### Adjacent prerequisite that's its own subscription

| Feature | Plan availability |
|---|---|
| **Sensitive Data Detection ruleset** | Enterprise on the Advanced application security plan. Separate subscription from API Shield. Enables the `cf-risk-sensitive` label. |
| **Advanced Rate Limiting** | Separate add-on. Required to actually enforce the rate limits Volumetric Abuse Detection recommends. |

---

## What this looks like at a glance

There are effectively three tiers of availability:

1. **Universal (all plans, including Free):** Endpoint Management, Schema Validation, Endpoint Labels, mTLS managed CA. This is the "you already have some API protection without buying anything" set.
2. **Trial-accessible (Enterprise contract, no API Shield purchase yet):** Schema Validation gets log mode, plus the 30-day preview unlocks JWT Validation, Sequence Analytics, GraphQL Query Protection, API Discovery, Volumetric Abuse Detection, Authentication Posture, BOLA Detection, Schema Learning. Worth noting: Sequence Analytics, JWT Validation, and GraphQL Query Protection all have docs language hinting Pro/Business can also enable the trial -- but the Preview Services billing page says contracted (Enterprise) customers only.
3. **API Shield purchase (Enterprise + API Shield contract):** Everything above gets generous limits. Adds Vulnerability Scanner (open beta), Sequence Mitigation (closed beta).

The implication for design research: for **Free / Pro / Business** customers, API Shield as a product is essentially three features (Endpoint Management, Schema Validation, Endpoint Labels) plus mTLS. Everything that creates the "wow" moment in Emmanuel's demo -- Discovery, JWT validation, Sequences -- is locked off entirely or trial-gated.

---

## Where my reading might be wrong

Two things I would flag for your team to verify against internal source:

1. **API Discovery on non-Enterprise plans.** You mentioned in chat that Discovery is "available for other plans as well, provided that it's not only the endpoints that are being discovered." I cannot find that distinction in the public docs. The API Discovery page is unambiguous: "only available for Enterprise customers." If there's a partial-Discovery surface for Pro/Business that the docs don't describe, that's a research finding worth pinning down.
2. **Trial path scope.** Three feature pages (Sequence Analytics, JWT Validation, GraphQL Query Protection) say Pro and Business can enable the API Shield trial. The Preview Services billing page says trials are for "contracted customers" only -- i.e. Enterprise. Either the feature pages are stale or the billing page is wrong. The truth probably matters for product positioning.

If either of these turns out to differ from the docs, the matrix above can be updated and the FigJam regenerated.
