# Replicating Emmanuel's setup — plan outline

A short plan for reproducing Emmanuel's API Shield lab on the CartNova Cloudflare zone (`carnova.uk`). Based on the transcript, the two wiki pages, and the decisions already made in this conversation.

## Key decisions already made

- **Same Cloudflare zone.** Imaged apps will live under `carnova.uk` subdomains (e.g. `petstore.carnova.uk`). The mixed-zone sprawl is the point; we want the "many apps, fragmented auth, single zone" conditions real enterprise customers see.
- **Flat subdomains.** No `lab.` prefix. More realistic, keeps the sprawl honest.
- **Emmanuel's flagship demo is the goal.** End state: Petstore sensitive endpoint blocked without a token, Python script generates a JWT, request succeeds.
- **Still open for discussion:** infrastructure host (laptop + Docker / cloud VM / Cloudflare Containers) and traffic generator scope (CartNova-only vs. extend to imaged apps).

## Phase 0 — Decisions to lock in before starting

1. Infrastructure host — laptop, cloud VM, or Cloudflare Containers. Leaning cloud VM for always-on.
2. App list — default is Petstore + Juice Shop + Grafana + httpbin. Confirm or trim.
3. Traffic generation scope — keep CartNova generator focused on CartNova; decide later whether to extend.

## Phase 1 — Infrastructure and tunnel

1. Provision the host (VM or laptop).
2. Install Docker and Docker Compose.
3. Install `cloudflared`.
4. Register a tunnel against the CartNova Cloudflare account.
5. Confirm the tunnel shows as healthy in the Zero Trust dashboard.

**Done when:** the tunnel is up and reachable from Cloudflare, with no containers running behind it yet.

## Phase 2 — First container (Petstore)

1. Pull `swaggerapi/petstore` from Docker Hub.
2. Write a minimal `docker-compose.yml` with Petstore as the first service and `cloudflared` as the tunnel connector.
3. In Zero Trust, add a Published Application: `petstore.carnova.uk` → `http://localhost:8080` (or whichever port Petstore exposes).
4. Visit `https://petstore.carnova.uk` in a browser. Confirm the Swagger UI loads.
5. Confirm API Shield Discovery starts seeing requests against the new hostname.

**Done when:** Petstore is reachable publicly via `petstore.carnova.uk` and API Shield Discovery lists its endpoints.

## Phase 3 — Emmanuel's JWT validation demo (the flagship)

Following `wiki-03-implementing-jwt-validation-for-petstore-swagger-api.md`:

1. Generate a key pair at [mkjwk.org](https://mkjwk.org) (RS256 or ES256). Save the private key PEM, public key PEM, and JWK.
2. Upload the public JWK to Cloudflare: **API Shield → JWT Settings → Add configuration**.
3. Configure Session Identifier as a JWT Claim (e.g. `sub`).
4. Create a JWT Validation Rule scoped to the Petstore's sensitive endpoint (`GET /api/v3/store/inventory`), action: **Block**.
5. Curl the endpoint without a token — confirm it's blocked (error code 120, "access denied").
6. Adapt Emmanuel's Python script (from `wiki-02`) to sign a token with the local private key. Verify on [JWT.io](https://jwt.io).
7. Curl the endpoint with the token — confirm it returns 200.
8. Review **Security → Events** to see the JWT validation block-and-allow events with correct reasons (`missing token`, then success).

**Done when:** the full "blocked → token generated → unblocked" demo works end-to-end, exactly as Emmanuel shows it.

## Phase 4 — Add the remaining apps

Repeat the pattern from Phase 2 for each app. Each gets its own service in `docker-compose.yml`, its own subdomain, and its own Published Application in Zero Trust.

1. **Juice Shop** (`juice.carnova.uk`) — `bkimminich/juice-shop`. A second vulnerable e-commerce surface; good for BOLA sanity-checking.
2. **Grafana** (`grafana.carnova.uk`) — `grafana/grafana`. Populates Discovery with non-business observability traffic.
3. **httpbin** (`http.carnova.uk`) — `kennethreitz/httpbin`. Small, status-code-driven; good for rate-limit demos.

**Done when:** all four apps are reachable under subdomains of `carnova.uk` and all four appear in API Shield Discovery.

## Phase 5 — Traffic (light, to warm the dashboards)

For now, Emmanuel's own scripts are sufficient — no need to build a full traffic generator for the imaged apps.

1. Copy Emmanuel's Bash traffic generator from `wiki-02` (the one that loops against Petstore endpoints with random IDs and rotating JWTs).
2. Adjust the domain variable to `petstore.carnova.uk`.
3. Run locally for a few minutes to confirm traffic lands in API Shield Session Identifier stats, Sequence Analytics, and Volumetric Abuse Detection.
4. Later (optional): decide whether to extend the CartNova traffic generator Worker to drive these apps too, or leave them on manual/scripted runs.

**Done when:** running the script produces visible hits in the dashboard and at least one rate-limit recommendation appears within 24 hours.

## Phase 6 — Observe and document

The design-research output is the point. Once the lab is running:

1. Capture what API Shield Discovery looks like with five apps under one zone (screenshot).
2. Capture what happens to Authentication Posture when the zone-wide session identifier doesn't cover all apps' auth mechanisms.
3. Capture whether cross-app sequences surface in Sequence Analytics.
4. Write up observations as a new Deep Dive.

**Done when:** the mixed-zone observations are documented alongside the existing CartNova-only observations.

## What's intentionally not in this plan

- **Kubernetes.** Docker Compose is enough. Emmanuel runs Compose; we match.
- **Custom images.** Everything is pulled from public registries unmodified.
- **OWASP Juice Shop hardening.** It's supposed to be vulnerable; leave it alone.
- **A second JWT demo.** Petstore is the flagship; don't duplicate it elsewhere unless a specific research question demands it.
- **mTLS for imaged apps.** No natural use case.

## Cross-references

- Transcript: `transcript.md`
- Emmanuel's JWT-validation walkthrough: `wiki-02-securing-apis-with-jwt-validation.md`
- Step-by-step Cloudflare configuration: `wiki-03-implementing-jwt-validation-for-petstore-swagger-api.md`
- Background on Docker images: `reference-what-is-a-docker-image.md`
- Designer-friendly deep dives: `../Deep Dives/02-Emmanuels_Setup_Vs_CartNova.md`, `03-VPC.md`, `04-Docker_Containers.md`
