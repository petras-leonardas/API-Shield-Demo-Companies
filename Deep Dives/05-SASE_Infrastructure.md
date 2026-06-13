SASE Infrastructure
-------------------


The coffee shop that used to be an office
-----------------------------------------

For most of the last forty years, a corporate network looked roughly like an office building. Employees swiped a badge, came inside, and were trusted. The files, the email, the databases, the internal apps all sat within the walls. Anyone working from outside dialled in through a virtual private network, known as a VPN, which was essentially a long encrypted tunnel that made their laptop pretend it was also inside the building. This model is usually called castle-and-moat security: one big wall, one drawbridge, and a lot of trust on the inside.

That model quietly stopped matching reality. Employees started working from homes, cafés, and hotels. The apps they used moved into public clouds and SaaS products. A sales engineer opening Salesforce on a Tuesday morning has no reason to route that request through an office in Dublin, but the VPN forced them to. The castle had been rebuilt as a coffee shop and nobody told the drawbridge.

SASE, which stands for Secure Access Service Edge, is the industry's name for redrawing the diagram. The core idea is to take all the security controls that used to live in boxes at the office edge — firewall, VPN concentrator, web filter, data-loss prevention, identity gateway — and move them into a global cloud network between every user and every app. Instead of traffic travelling to security, security travels to traffic. Gartner coined the term in 2019 and it is now the default language for how network security is sold to enterprises.


What SASE actually bundles together
-----------------------------------

The easiest way to understand SASE is to recognise that it is not one product. It is a bag of five or six products that used to be sold separately, now delivered as one service from one cloud. A full SASE platform typically includes Zero Trust Network Access, which replaces the VPN by checking identity and device posture on every single request; a Secure Web Gateway, which filters outbound internet traffic; a Cloud Access Security Broker, which watches how employees use SaaS apps; data-loss prevention, which spots sensitive data leaving the company; a software-defined wide-area-network layer, known as SD-WAN, which replaces the expensive private circuits wiring offices together; and a firewall delivered as a service rather than as a box. Cloudflare sells its version under the name Cloudflare One.

API Shield is not part of the SASE bundle in the strict sense. SASE protects the people and devices inside a company; API Shield protects the APIs that customers and partners on the outside use to reach that company's applications. But the two share an infrastructure, a control plane, and a mental model, which is why they keep being sold in the same conversation. A customer who already uses Cloudflare One for their workforce is used to thinking about traffic at the edge, identity on every request, and policy from one dashboard — all of which makes API Shield feel like a natural extension rather than a new purchase.


Why Emmanuel's lab is accidentally a SASE blueprint
---------------------------------------------------

Emmanuel said of his lab that it "happens to be a working example of the SASE architecture Cloudflare is pushing — every customer eventually moves there, and seeing it running on a free Cloudflare account is a good hook for Zero Trust and WARP upsell later." His shape matches the SASE shape cleanly, and it is the clearest small example of the pattern you are likely to encounter.

His applications — Swagger Petstore, OWASP Juice Shop, Grafana, Kibana, httpbin — all run as Docker containers inside a single Virtual Private Cloud. None of those containers has a public address or an inbound port open to the internet. A small program called cloudflared runs alongside them and opens an outbound encrypted tunnel up to Cloudflare's network. That tunnel is the SASE bit. Emmanuel then adds each container to Zero Trust as a Published Application, picks a subdomain of his root zone, and points it at the container's local port. A browser anywhere in the world can reach `petstore.<his-domain>` and the request flies into Cloudflare's edge, gets inspected for identity, bot signals, rate limits, JWT tokens, and schema compliance, and is only then handed down through the tunnel to the container. Every layer of policy sits in the cloud. The origin stays dark.

That is the SASE pattern in miniature. One tunnel replaces a perimeter firewall. One Zero Trust dashboard replaces a VPN concentrator. One root zone with many subdomains replaces a tangle of public hostnames. And the same policy engine that controls who can reach the Juice Shop also controls which API calls are allowed into the Petstore. Networking and security stop being separate stacks.


What CartNova shows by not having any of this
---------------------------------------------

CartNova sits at the other extreme. The entire marketplace — thirty-seven API endpoints, nine frontend pages, the checkout flow — runs inside a Cloudflare Worker on the edge itself. No VPC, no Docker, no tunnel, no origin server. The workload has moved all the way into the cloud platform that used to only sit in front of it. Think of CartNova as the destination Emmanuel's lab is sketching the route to: a place where the edge is not a gateway to the real application but is the real application. Most enterprises will not get there for a decade. Cloudflare itself already runs that way.


The honest version
------------------

SASE is a real shift, but it is also a marketing umbrella, and three notes are worth carrying into customer conversations.

First, almost no enterprise is fully on SASE, and almost none will be for years. Payment systems, compliance-bound databases, and decades-old internal tooling tend to stay put. The realistic shape of a large customer is hybrid: Cloudflare at the edge, the old VPN still running, and a long tail of apps still hiding inside traditional perimeters.

Second, Cloudflare did not invent the SASE bundle and is not the only vendor selling one. Zscaler, Netskope, Palo Alto, and Cisco all have comparable platforms. Cloudflare's distinctive claim is that every service runs in every point of presence, which reduces the latency penalty of routing traffic through security. Many customers already have Zscaler or Netskope deployed for their workforce and are evaluating Cloudflare only for the application-facing side.

Third, API Shield lives on the edge of the SASE story, not in the centre. The people buying Cloudflare One and the people buying API Shield are often different teams. A digital-native customer like CartNova might buy API Shield first and discover the rest of Cloudflare One later; a large enterprise usually goes the other way. The design implication is that API Shield cannot assume SASE fluency in its audience, and the Zero Trust dashboard cannot assume API fluency in its audience — which is why the two surfaces still feel disjointed even when sold together.


The bottom line
---------------

SASE is the industry's name for pulling security out of boxes at the edge of an office and putting it into a global cloud that sits between every user and every app. Emmanuel's lab is a small working example of the pattern: Docker containers in a private cloud, no inbound ports, one outbound tunnel, one dashboard for identity, routing, and API-layer policy. API Shield is not the headline of SASE, but it is the part of the story that matters for anyone protecting the applications customers actually call. The shape of a customer's SASE journey determines which teams a designer needs to talk to and which objections they will raise.


The vocabulary, summarised
--------------------------

- SASE — Secure Access Service Edge, an architectural model that combines network connectivity and security services into a single cloud-delivered platform. Coined by Gartner in 2019 and now the default language for modern enterprise security.
- Castle-and-moat security — the older model where one strong perimeter wall surrounds a trusted internal network. Users inside the wall are broadly trusted; users outside come in through a VPN.
- Virtual Private Network, known as VPN — an encrypted tunnel that lets a remote device behave as if it were on the company's internal network. The main thing SASE is trying to replace.
- Zero Trust — a security model that assumes no user or device is trusted by default, and checks identity and device posture on every request rather than only at the front door.
- Zero Trust Network Access, known as ZTNA — the product category that delivers Zero Trust for private application access. Cloudflare Access is an example. Inside the SASE bundle, it is the VPN replacement.
- Cloudflare One — Cloudflare's name for its SASE platform, which packages ZTNA, secure web gateway, cloud access security broker, data-loss prevention, and related services under one roof.
- Secure Web Gateway, known as SWG — a cloud service that filters outbound internet traffic, blocks malicious sites, and enforces acceptable-use policies.
- Cloud Access Security Broker, known as CASB — a service that sits between users and SaaS applications and watches how sensitive data is used in those apps.
- Data Loss Prevention, known as DLP — a category of tooling that detects when sensitive data is leaving the company and can block or log it.
- Software-Defined Wide Area Network, known as SD-WAN — a way of replacing expensive private circuits between offices with software-managed routing over the public internet.
- Cloudflare Tunnel, also called cloudflared — a small program that runs inside a private network and opens an outbound encrypted connection to Cloudflare, letting traffic flow in without any inbound port being open.
- Published Application — the name Cloudflare uses for an internal app that has been made reachable through a Zero Trust tunnel, typically exposed as a subdomain of the customer's root zone.
- Edge — the geographically distributed network of data centres where Cloudflare executes policy, runs Workers, terminates tunnels, and enforces API Shield rules. In SASE, the edge is where security happens.
- WARP — Cloudflare's device client that routes a laptop or phone's traffic through the Cloudflare network. The workforce-side counterpart to a Cloudflare Tunnel on the origin side.


Questions worth asking customers
--------------------------------

- Do your employees still use a VPN to reach internal applications, and if so, which ones and why those specifically?
  - A shrinking VPN footprint with a handful of stubborn exceptions is the normal state of an enterprise mid-SASE. The exceptions usually point at the legacy systems that will also be the hardest to put behind API Shield.

- If you had to name the single tool that controls who can reach your internal applications, what would you name?
  - A confident single answer like Cloudflare Access or Zscaler Private Access signals a mature Zero Trust posture. A list of three tools or a pause before answering signals that the old perimeter is still doing most of the work.

- Who owns your Cloudflare One or equivalent SASE deployment inside your company, and who owns API Shield?
  - In most enterprises these are different teams, sometimes in different departments. The answer tells a designer whose calendar to fight for when research or rollout needs cross-team sign-off.

- Are your APIs reached through a Cloudflare Tunnel, through a public load balancer, or through something older?
  - Each answer implies a different amount of infrastructure work before API Shield's more advanced features can be fully used. Tunnels are a sign the customer is already thinking in SASE terms.

- When you talk about your origin, do you mean a data centre, a specific cloud account, or a Cloudflare Worker?
  - The further right the answer falls on that list, the closer the customer already is to the model CartNova embodies. Most customers will name a cloud account; very few will name a Worker.

- If an outside auditor asked for one diagram of how traffic reaches your APIs, who in your company would draw it, and how long would it take?
  - The name is usually a single network engineer, and the honest time estimate is usually weeks. That gap is most of the reason enterprise API Shield rollouts stall, because the diagram is a prerequisite for every serious policy decision.

- Has your team ever retired a VPN endpoint completely, and what was involved?
  - A yes with a story is evidence of real Zero Trust adoption. A no is evidence that the VPN is still load-bearing, and that any pitch positioning API Shield alongside SASE needs to acknowledge the drag of coexisting with that older infrastructure.

- Do the people who manage your Cloudflare account know what APIs your developers are currently exposing, without asking the developers?
  - A yes here is rare and usually a sign that endpoint discovery is already trusted inside the organisation. A no is the more honest answer and points straight at the shadow-API conversation that API Shield is ultimately trying to solve.
