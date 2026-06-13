# Emmanuel's API Shield Lab Setup — Walkthrough Transcript

**Date:** April 17, 2026
**Participants:** Emmanuel Francis (SE, demoing his setup), Leo Bacevicius (Product Designer, Application Security)
**Duration:** ~59 minutes

---

## Overview

Emmanuel walked Leo through his personal API Shield demo lab. The goal was to show how he has everything wired up end-to-end so that every API Shield feature can be demoed to customers from a single environment. Leo's follow-up project (this repo) is building a similar lab from scratch, using Cloudflare Workers instead of a VPC + Docker setup.

---

## 1. Infrastructure — Where Everything Lives

Emmanuel runs his demo environment from a **VPC** (virtual private cloud, equivalent to the Google Cloud instances Cloudflare provides internally). Inside the VPC, he runs a `docker-compose` stack with a collection of Docker containers — each container is a self-contained, lightweight application image that he can spin up on demand.

Why Docker containers:

- An image bundles only the processes needed to run an app. No need to install a full stack (e.g. WordPress + MySQL + a web server) — just pull the image and run it.
- Low CPU and memory footprint.
- Easy to swap apps in and out of the compose file.

At Cloudflare, the equivalent offering is now called **Containers** (recently released). Emmanuel uses Docker locally because his lab predates Containers.

### The apps in his stack

Emmanuel keeps multiple apps running simultaneously, each for a different demo purpose:

| App | Purpose |
|---|---|
| **httpbin** | Good for testing request/response status codes visually. Better than showing a terminal full of curl output to a customer. Example: rate-limiting demo by blocking on a specific status code. |
| **Swagger Petstore** | The main API Shield demo. Has every component API Shield needs — OpenAPI schema, realistic endpoints, a sensitive endpoint for JWT demos. This was the focus of the session. |
| **Juice Shop** (OWASP) | A deliberately vulnerable e-commerce app. Good for demoing the full Cloudflare security stack — WAF, Turnstile on forms, bot protection, etc. Covers e-commerce and airline-agency-style journeys. |
| **Grafana** | Replicates what Cloudflare uses internally. Important for showing realistic observability traffic behind API Shield. |
| **Kibana** | Same — replicates Cloudflare's own infrastructure (logs from R2 objects, Workers, etc.). |
| **Various competitor apps** | For competitive testing. |

Each app is just a pulled Docker image wired into the compose file. Example flow: grab the `docker pull` command from the tool's GitHub repo (e.g. gotestwaf), paste it, add a new service block to the compose file, restart. Done.

### Connecting the VPC to Cloudflare

Everything is published through a **single `cloudflared` tunnel** running at the bottom of the compose stack.

- The tunnel terminates on Cloudflare's edge via an encrypted connection.
- Each app gets published as a **subdomain** of one root zone (`api.<domain>` in his case).
- In Zero Trust, Emmanuel adds each container as a "Published Application" — just picks the subdomain from a dropdown of on-boarded zones and points it at the app's `localhost:<port>`.

This is the key architectural shortcut: **one zone, many subdomains, one tunnel**, instead of a separate Cloudflare zone per app.

**Why this matters for the demo:** customers understand Docker and tunnels immediately (most of the audience is developers). The setup also happens to be a working example of the SASE architecture Cloudflare is pushing — every customer eventually moves there, and seeing it running on a free Cloudflare account is a good hook for Zero Trust and WARP upsell later.

### Leo's contrast

Leo's own setup uses a Cloudflare Worker with a fake e-commerce frontend and API routes, wired directly into a Cloudflare zone. Emmanuel confirmed that his apps are *not* running on Workers — they run locally in the VPC and are exposed through the tunnel.

Leo's observation: a lot of real customers have multiple apps under a single zone. When Cloudflare colleagues ask for "endpoints grouped by application" in the API Shield UI, this is the scenario they mean.

---

## 2. The Swagger Petstore Demo

Emmanuel uses the Swagger Petstore container as the core API Shield demo. It ships with an OpenAPI (Swagger) spec, which means it has everything API Shield needs to function properly: defined endpoints, schemas, request/response shapes.

### What the Petstore spec is

- An `openapi.json` file following the OpenAPI standard. Same format Cloudflare itself uses for its public API.
- Customers can customise it — swap the external docs URL for their own, change the branding, add claims, etc. Emmanuel kept it largely default.

### Demo flow — showing a sensitive endpoint blocked, then unblocked

1. **Pick a sensitive endpoint.** Emmanuel uses `GET /inventory` on the Petstore — set up as a sensitive endpoint in API Shield.
2. **Call it without a token.** Request is blocked. Cloudflare returns `Access denied (error code 120) — request blocked by Cloudflare firewall`.
3. **Generate a JWT.** He runs a small Python script (`python3 gen.py`) that signs a token using a local private key.
4. **Paste the token into the Swagger UI's Authorize field.**
5. **Re-execute the request.** Now returns 200. Access granted.

Everything a customer sees here is automatable — the script path is exactly what their CI would do.

---

## 3. API Shield Configuration — Step by Step

### 3a. Schema validation

- **With a schema:** upload the OpenAPI spec directly via Schema Settings → Active Schema. Emmanuel uploaded the Petstore schema.
- **Without a schema:** if the customer doesn't have one, API Shield's **machine learning will build a schema automatically** from traffic. Generate traffic for a bit and a learned schema becomes available.
- The schema is then tied to the application and to Endpoint Management — this is where the customer chooses which endpoints from the schema they actually want enforced/validated.

### 3b. Endpoint discovery

- The Discovery tab showed entries for Grafana, Kibana, etc. — because earlier in the demo Emmanuel made requests against those apps, API Shield picked them up automatically.
- **Why this is valuable:** the #1 problem in the industry is that security teams don't talk to developers until there's an API abuse incident. At that point security has to chase developers to find out what endpoints exist. Discovery closes that gap — security gets visibility without having to ask.
- For undocumented apps (no uploaded schema), Discovery surfaces them and auto-labels them (e.g. `cf-api-endpoint`). Customer can click Save to promote them into Endpoint Management.

### 3c. Session identifiers

- Found under **Web Assets → Session Identifiers**.
- Emmanuel added the JWT `Authorization` header used by the Petstore as a session identifier.
- Stats panel showed ~100,831 requests in 7 days — generated by an automated script he runs that mixes valid JWTs (from his generator) with randomised bogus headers, machine-to-machine.
- He also added his **JWT claim** (the `key` used to sign tokens) as a session identifier input.

#### Question: how many session identifiers do customers typically need?

- Default limit is 10.
- In 4 years, only one customer has asked for more (Kahoot). Product said yes, technically possible. Customer never came back — presumably solved it without the raise.

#### Question: do security teams usually know what identifiers to configure?

- The identifier must match whatever the application uses in its header/cookie logic.
- Cloudflare itself uses `cf_clearance` cookie for internal sessions — good real-world example.
- If the customer doesn't want to change their application logic, Cloudflare can **inject a custom header at the edge** via a Transform Rule (Request Header Transform → Set Dynamic → e.g. `X-Secret: true`) before the request hits origin. Useful when the session identifier needs to exist but the app team refuses to add it.

### 3d. Sequences (customer journeys)

- Sequences show endpoint traversal patterns — e.g. login → catalog → add to cart → catalog → add to cart → cart → checkout.
- **Business value:** marketing/product can see whether users follow the intended journey (e.g. are they hitting login before the sale page?).
- **Security value:** detect abnormal sequences — login → checkout → login → checkout is probably a bot. API Shield can mitigate on this.
- Sequences populate automatically once discovery is running against live traffic.

#### Important caveat Emmanuel flagged mid-demo

**Sequences only work on endpoints that have been saved into Endpoint Management.** Discovery alone is not enough. Emmanuel's dashboard showed empty sequences for endpoints he hadn't yet promoted from Discovery — so in a live demo you must save the endpoints first.

#### Leo's question: in real customer dashboards, are sequences as clean as the pet-store/login/checkout example, or as noisy as Discovery (thousands of endpoints)?

Emmanuel's answer: clean, because the sequences only run on saved endpoints, so the noise from Discovery doesn't leak in.

### 3e. The Discovery / Endpoint Management merge

Leo mentioned that the team is merging Discovery and Endpoint Management, and the new direction is likely to auto-save discovered endpoints.

Emmanuel's concern: **Discovery should stay separate.** If an attacker-discovered endpoint gets auto-promoted into your managed set, you lose the whole point of Discovery — which is to *surface* shadow endpoints, not silently bless them. He'll follow up with the PMs. He already has an open thread with them on the related JWT / Custom Rules / Rate Limiting unification work that was discussed in London.

### 3f. JWT validation rules

- Found under **Security → API Shield → Validation Rules** (not Web Assets, which Emmanuel agreed is awkward placement).
- To create a rule:
  1. Select hostname.
  2. Select the sensitive endpoints to protect.
  3. Select the HTTP methods.
  4. Attach the JWT claim configuration (e.g. JWT RS256 + the API key header config).
  5. Action: **Log** or **Block** non-compliant requests.

#### Uploading JWT keys

- Under the same area: **Add Configuration** → select header or cookie name (e.g. `API-Key`) → paste or upload the JSON Web Key.
- Then the configuration is available to attach to a validation rule.

#### Leo's UX observation

> "Customers still have to set up the JWT rules themselves, right? There's still quite a bit of effort. You're not doing that within Web Assets — you have to go to Security Rules."

Emmanuel agreed 100%. The placement is inconsistent — Session Identifiers live under Web Assets but Validation Rules live under Security Rules. He'd rather have session-identifier-related configuration consolidated. Only customers who have purchased API Shield see this surface at all.

### 3g. Using JWT claims in Advanced Rate Limiting

This is the payoff of adding the claim to the session identifier earlier.

- In Advanced Rate Limiting, instead of using IP as the characteristic, you can rate limit by **JWT claim**.
- Example rule: "If `API-Key` header does not exist (or JWT claim is missing/spoofed) and request matches my application, rate limit aggressively." Catches attackers trying to spoof tokens without the right claim structure.

### 3h. Observability — seeing the rules work

- Emmanuel ran a fresh request without a token and looked at Security → Events.
- Event showed: API Shield JWT token block, reason = `missing token`, plus the configuration ID.
- For expired/malformed tokens he also sees: `claim not found`, `token expired` — all surfaced in the event log. This is what he shows customers to prove the value end-to-end.

---

## 4. Running Traffic Against the Lab

Emmanuel has a set of Python scripts to drive automated traffic through the Petstore. A few he referenced during the call:

- `gen.py` — generates a signed JWT (uses a local private key + claim payload).
- An automatic end-to-end script that generates tokens on the fly and exercises the sensitive endpoint (machine-to-machine, not human-driven).
- A domain-agnostic traffic script (`traffic_sequence.sh` / `custom.sh`) that takes a domain + endpoint and loops requests against it. Useful for driving sequences and populating session-identifier stats.

He ran a live script mid-call; it was hitting the wrong path initially (missing `/petstore` prefix in the URL), he corrected it, and the dashboard's session-identifier counter started climbing (e.g. 824 → 900+ requests) within a minute or two.

### Leo's note

Leo has his own traffic scripts running via GitHub Actions and has already hit his Workers credit cap on the free plan. Emmanuel is going to share all his scripts — they live in his internal wikis.

---

## 5. Sales Enablement — the Gap

Leo asked whether Cloudflare sales engineers have a similar lab.

**Emmanuel's answer: no — and he thinks that's a big part of why API Shield hasn't sold as well as it should.**

- The old internal wiki on setting up a Petstore demo has been around for 7–8 years, but it's incomplete — it doesn't cover the JWT validation configuration, which is the single most important feature of the product.
- Emmanuel has written follow-up wikis covering:
  1. The Petstore setup (with Cloudflared tunnel).
  2. **Securing APIs with JWT tokens** — the one that gets the most reactions. SEs reach out to him after reading it and ask him to co-run customer calls.
  3. A third wiki with all his traffic-generation scripts, ready to copy/paste.
- He can't force SEs to build their own lab, but he does walk them through it when asked.

---

## Outcome and Next Steps

Leo's takeaways from the session:

1. **No need to build mock websites from scratch.** The Docker images (Petstore, Juice Shop, Grafana, Kibana, httpbin) give a realistic demo surface for free.
2. **One zone + many subdomains + one `cloudflared` tunnel** is the right architecture for a lab — avoids paying for or managing multiple zones.
3. **Sequences depend on Endpoint Management being populated** — discovery alone won't drive them.
4. **The UX split between Web Assets and Security Rules** is a real pain point worth documenting from a design perspective.
5. **The Discovery → Endpoint Management merge needs scrutiny** — auto-promoting discovered endpoints may undermine the whole point of Discovery. Worth raising with the PMs.
6. Leo will adapt this thinking into the Cartnova / Meridian lab (Workers-based) — not trying to match Emmanuel's polish, just reusing the right patterns.

Emmanuel to share: his wiki links, JWT generation script, and traffic scripts.
