# MeridianBank -- Company Profile

## Overview

**Company:** MeridianBank
**Type:** Mid-size retail and commercial bank
**Founded:** 35 years ago (digitizing for the last 12)
**Size:** ~2,000 employees, ~200 in IT across multiple divisions
**HQ:** Frankfurt, Germany
**Business model:** Traditional retail banking (accounts, transfers, cards), commercial banking (partner payments, FX), and wealth management (acquired 5 years ago).

## What MeridianBank Does

MeridianBank serves retail customers, commercial partners, and high-net-worth clients across Europe:

- **Retail customers** use online and mobile banking to manage accounts, make transfers, pay bills, and check balances.
- **Commercial partners** (merchants, payment processors, fintechs) integrate via B2B APIs for payment processing, KYC verification, and FX rates.
- **Wealth management clients** access portfolio management through a platform inherited from an acquisition 5 years ago that was never fully integrated.
- **Internal systems** (risk scoring, compliance, notifications, audit) were built as microservices that communicate via HTTP -- some of which are accidentally exposed to the public internet.

The bank processes ~500,000 API requests per day across all systems.

## Why They Represent the Discovery Plateauer Persona

MeridianBank maps to the **Discovery Plateauer** -- the most common pattern in the research. This is the scenario Tofarati described: *"they get thrown off by the thousand and something endpoints they see in discovery. It's like, 'Really, a thousand and something endpoints? Where do I start from?'"*

Key characteristics:
- **Security team doesn't own the applications.** The central InfoSec team manages Cloudflare but doesn't know what APIs exist or who built them. (Mateus: *"they don't have deep knowledge of the applications that they would try to protect."*)
- **Nobody has a full picture.** Different teams built APIs independently over 12 years. There is no API catalog, no central governance, no single source of truth.
- **75% undocumented, 25% completely unknown.** Tamires's ratio applies: most APIs lack documentation, and a significant portion are entirely unknown to the security team.
- **Cross-team coordination is required but impossible.** Getting developers from 5+ teams onto a call to explain their APIs is what Tofarati described as *"pulling tooth."*
- **Session identifiers are unknown.** Different services use different auth mechanisms. The security team can't answer "which header identifies a session?" because the answer varies by service.

## The 12-Year Digitization Timeline

Understanding how MeridianBank got here explains the mess:

| Year | Event | API Impact |
|------|-------|------------|
| 2014 | Card services go online | SOAP-based XML API with WS-Security. Still running. |
| 2016 | Online banking portal launched | REST-ish APIs with `camelCase` verb naming (`doTransfer`, `getAccounts`). API key auth. |
| 2019 | Partner payment APIs built | Modern REST with mTLS. Different team, different conventions. |
| 2020 | Acquired wealth management firm | Inherited their APIs wholesale (`/wm/api/1.0/`). Basic Auth. Never re-platformed. |
| 2022 | Mobile banking app launched | Modern REST (`/api/v3/`). JWT auth. Clean design -- but only covers mobile features. |
| 2023 | Microservices refactor begins | Internal services (`/internal/`, `/svc/`) built for service-to-service communication. Some accidentally exposed. |
| 2024 | Security team asked to "secure the APIs" | They open API Shield. Run discovery. See 150+ endpoints. Stall. |

## Why MeridianBank Needs API Shield (in theory)

1. **Regulatory compliance.** PSD2, SOX, and PCI-DSS all require API security controls. The CISO needs to demonstrate protection.
2. **Shadow API exposure.** Internal services (risk scoring, audit logs, compliance checks) are accessible from the public internet with no authentication.
3. **Sensitive data leakage.** SSNs in KYC responses, full card numbers in card services, database connection strings in debug endpoints.
4. **No visibility.** The security team literally does not know what APIs exist, who owns them, or what data they expose.
5. **Consolidation play.** They already use Cloudflare for CDN and WAF. Adding API Shield avoids another vendor.

## Why MeridianBank Will Struggle with API Shield (in practice)

1. **Discovery output is overwhelming.** 150+ endpoints as a flat list with no grouping, no traffic data, no risk signals.
2. **Path variables explode the list.** `/api/v3/accounts/ACC-12345/transactions/TXN-67890` appears as a unique endpoint for every customer and transaction. (Nuno: *"If I need to go through 6,000 endpoints, I might as well just be manually creating rules."*)
3. **No schemas to upload.** Schema validation requires OpenAPI specs. MeridianBank doesn't have them. ML-learned schemas are the only option, but confidence in machine-generated schemas is low. (Tofarati: *"How confident are we with that learned data?"*)
4. **Session identifiers are a blocker.** Rate limiting and sequences both require session identifier configuration. But different services use JWT, API keys, Basic Auth, or no auth at all. The security team can't answer which header to configure.
5. **"Who owns this endpoint?"** The first question after discovery isn't "how do I protect this?" -- it's "who built this and is it supposed to be here?" (Mateus on NATO: *"they know for a few of the applications who the owner is but for some others maybe they don't know."*)
6. **Cross-team coordination fails.** Even if the security team identifies which endpoints need protection, they need developers to provide schemas, session identifiers, and expected sequences. Those developers are in different teams and don't prioritize API security.

## Organizational Context

| Attribute | Value |
|-----------|-------|
| Security team | Central InfoSec -- manages Cloudflare but doesn't own applications |
| API governance | None. Each team builds independently. |
| Schema availability | None. No team maintains OpenAPI specs. |
| Session identifier knowledge | Unknown. Varies by service. Security team can't answer this. |
| API documentation | Partial for mobile banking. None for legacy, internal, or acquired systems. |
| Cloudflare relationship | Existing customer (CDN, WAF, Bot Management). API Shield was added after a bot management escalation. |
| Internal politics | Developers see API security as "the security team's problem." Security team sees it as "the developers' problem." Neither can progress without the other. |

## Expected API Shield Journey (the stall)

This is what will actually happen:

1. **Discovery** -- Run discovery. See 150+ endpoints as a flat, unprioritized list. Realize the list is unmanageable.
2. **Attempt to save endpoints** -- Try to save some. Realize path variable variants need to be manually dismissed. Give up after 20 minutes.
3. **Try to find the important ones** -- Want to see which endpoints get the most traffic or carry sensitive data. Can't -- discovery doesn't show this.
4. **Ask "who owns this?"** -- See endpoints like `/svc/notification/send` and `/internal/risk-engine/score/{id}`. Don't know what team built them or whether they should be public.
5. **Request an export** -- Ask to export the endpoint list to share with developers. (Tofarati: *"'Is there any way we can export this discovered endpoints and we can share it with our developers?' We never hear back from them."*)
6. **Stall.** The list sits there. No progress toward schema validation, rate limiting, or enforcement. API Shield becomes *"something that is there on the corner for them to do eventually"* (Mateus).

**This is the discovery plateau.**
