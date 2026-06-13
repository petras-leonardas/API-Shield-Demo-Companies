# Emmanuel's Setup vs. CartNova

## Two ways to build the same showroom

Imagine you want to show someone what a car dealership is really like. You have two options. The first is to borrow a real used Honda Civic, park it on a rented lot, and hand over the keys -- it drives, it has dings, it has that particular smell. The second is to commission a model-maker to build a perfect scale replica of a Civic, where every door, wheel, and cupholder is hand-sculpted to your exact spec. Both will teach a visitor what a Civic is. But one is a lot faster to put on the lot, and the other is a lot easier to repaint.

Emmanuel's API Shield lab and the CartNova lab are those two options. Emmanuel borrows real, off-the-shelf applications (the used Honda) and points Cloudflare at them. CartNova is a hand-built replica of a marketplace, designed specifically to exercise API Shield from end to end. This deep dive is about what each approach gets you, what it costs, and why both exist in the same project.

## Where the applications live

Emmanuel runs everything from a **Virtual Private Cloud** -- a slice of a cloud provider where you get your own private network and can run whatever you like. Inside it, he uses **Docker**, a tool for packaging an application into a self-contained image that can be started and stopped like a single program. A **Docker Compose** file describes a whole stack of those images running side by side. Emmanuel has one such file that runs around half a dozen applications at once: the Swagger Petstore (a reference API used to demo API tools), OWASP Juice Shop (a deliberately vulnerable e-commerce site), Grafana and Kibana (the same observability tools used inside Cloudflare), and a few others. He did not build any of these. He pulled them off GitHub, dropped them into his Compose file, and restarted the stack.

To connect that stack to Cloudflare, he uses **`cloudflared`**, a small program that opens an encrypted tunnel from inside his VPC out to the Cloudflare network. One tunnel, one root domain, and each application published as a subdomain (for example `petstore.api.<his-domain>` points to `localhost:8080` inside his VPC). From Cloudflare's point of view, traffic arrives as if each subdomain were a separate public website -- but nothing is actually exposed on the open internet. The VPC door is closed; only the tunnel is open.

CartNova takes the opposite path. It is a single **Cloudflare Worker** -- code that runs on Cloudflare's edge servers themselves, with no VPC, no Docker, and no tunnel. The Worker hosts both the API (thirty-seven endpoints across products, cart, checkout, users, orders, sellers, webhooks and three deliberately-exposed internal routes) and the frontend (nine HTML pages for the shop). The Worker is wired directly to the `carnova.uk` zone, so a request from a browser flies straight into the edge, hits Worker code, and comes straight back. There is no origin behind it. The whole marketplace is the edge.

## What you demo with each

Emmanuel's setup is fast and opportunistic. When a customer asks about rate limiting, he points at **httpbin** and blocks a specific status code. When they ask about vulnerabilities, he points at Juice Shop. When they ask about API Shield itself, he points at the Petstore -- which matters because the Petstore ships with an **OpenAPI** specification (the machine-readable contract that describes every endpoint, its parameters, and its expected response shape). Having that spec is what lets API Shield's schema validation work properly out of the box. Emmanuel can upload it and say "now try to send a malformed request" without writing any code.

But because the applications are generic, the story they tell is also generic. The Petstore has pets, not products. Its sensitive endpoint is `/inventory`. Nothing about it reminds a customer of their own business. And because the applications live behind a tunnel, Emmanuel cannot hand a customer a public URL and say "browse this like a real shop" -- the tunnel only works for authenticated sessions in his lab.

CartNova pays a heavy upfront cost to fix exactly that gap. The thirty-seven endpoints are modelled on a realistic marketplace: a checkout flow with a proper sequence (start, shipping, payment, confirm), **Personally Identifiable Information** (names, addresses, phone numbers) flowing through user and order endpoints, three authentication mechanisms (JWT tokens for buyers, API keys for sellers, **mutual TLS** for webhooks), and intentional vulnerabilities like **Broken Object Level Authorisation** baked into the order-lookup endpoints so that every major API Shield feature has a clean place to land. The **OpenAPI spec** is not yet written, which is a concrete gap compared to Emmanuel's setup -- schema validation cannot be fully demoed against CartNova until that file exists.

## Traffic -- the thing that makes the dashboards light up

API Shield learns from traffic. A dashboard with no traffic has empty charts, a flat discovery list, and no rate-limit recommendations, no sequence analytics, no session-identifier statistics. Both labs solve this, differently.

Emmanuel runs a handful of **Python** scripts from his laptop against his tunnel. One signs a JWT with a local private key. Another loops requests against any domain and endpoint he gives it. A third mixes real JWTs with randomised bogus headers to exercise the JWT validation path. The scripts are personal, live in internal wikis, and run only when he runs them.

CartNova runs a separate traffic-generator Worker on a **Cron trigger** (a scheduled timer) every two hours. Because Cloudflare will not count traffic that originates from Cloudflare's own network towards API Shield analytics, the Worker does not actually make the requests itself -- it fires a **GitHub Actions** workflow (a script that runs on GitHub's servers, outside Cloudflare) which then makes the requests from the public internet. The workflow simulates buyer journeys, seller activity, browsing, crawlers, scanners, and six scripted attack patterns. A single kill-switch constant in the config lets the whole thing be paused in seconds when the free-plan request quota gets tight. The scripts live in this repository and run without anyone touching a laptop.

## What each is actually good for

Emmanuel's lab is a breadth instrument. He can spin up a new demo application in ten minutes, wire it into a new subdomain in five, and put it in front of a customer the same afternoon. That is the job a sales engineer needs. The weakness is that the applications are someone else's, so the narrative is always adapted to what the Petstore or Juice Shop happens to look like.

CartNova is a depth instrument. It exists so that a designer can walk every step of the API Shield journey inside a story that feels like a real business. The checkout flow is a real checkout flow. The PII is in the places PII actually goes. Sellers and buyers are separate personas with separate auth. Nothing looks like a pet. The weakness is that it took weeks to build, it still needs an OpenAPI spec before schema validation works, and it runs on a free Workers plan with a ceiling of a hundred thousand requests per day -- which is why the traffic generator is tuned to sit at twenty per cent of that ceiling.

## The bottom line

Emmanuel's lab borrows applications to demo API Shield quickly. CartNova builds one realistic application to demo API Shield deeply. Emmanuel is optimised for *"I have a customer call in three hours, show me JWT validation working end-to-end."* CartNova is optimised for *"I am a designer studying what the second week of using this product actually feels like."* Neither is a substitute for the other, and the reason both exist in this project is that the design work needed the second thing and no one had built it.

---

### The vocabulary, summarised

| Term | What it means |
|------|---------------|
| Virtual Private Cloud (VPC) | A private, isolated slice of a cloud provider where you run your own servers and networks. Nothing in it is exposed to the public internet unless you deliberately expose it. |
| Docker | A tool that packages an application and everything it needs into a single self-contained image that can be started and stopped like a normal program. |
| Docker Compose | A configuration file that describes a stack of Docker images running together, so one command starts them all. |
| `cloudflared` | A small program that opens an encrypted tunnel from a private server out to Cloudflare's network, so traffic can reach the server without any public inbound port being open. |
| Cloudflare Worker | Code that runs on Cloudflare's edge servers rather than on a traditional web server. Used here to host both the CartNova API and the frontend in one place. |
| Zone | In Cloudflare, a single domain and everything underneath it (for example `cartnova.uk` and `petstore.api.cartnova.uk`). |
| OpenAPI specification | A standard, machine-readable file that describes every endpoint of an API, its parameters, and its expected responses. The input API Shield's schema validation needs. |
| Swagger Petstore | A generic reference API bundled by the OpenAPI project, widely used to demo API tools because it ships with a complete OpenAPI spec. |
| OWASP Juice Shop | A deliberately vulnerable e-commerce web application maintained by the Open Worldwide Application Security Project. Used to demonstrate security products against realistic attacks. |
| JSON Web Token (JWT) | A signed, structured token that proves who a user is. API Shield can verify it at the edge and enforce rules on its contents. |
| Personally Identifiable Information (PII) | Data that identifies a real person, such as name, email address, phone number, or home address. |
| Mutual TLS (mTLS) | An authentication method where both the client and the server present certificates to prove their identity. Used for webhook endpoints in CartNova. |
| Broken Object Level Authorisation (BOLA) | A common API vulnerability where an endpoint returns data without checking whether the requester is allowed to see that specific object. CartNova has it on purpose so API Shield's BOLA detection has something to find. |
| Cron trigger | A scheduled timer (named after the Unix `cron` utility) that runs a piece of code at fixed intervals. CartNova's traffic generator uses one to fire every two hours. |
| GitHub Actions | GitHub's built-in automation platform. Used here to run traffic scripts from outside the Cloudflare network, so the requests count towards API Shield analytics. |

### Questions worth asking customers

**"Do you have a lab or a non-production environment where you test API Shield before turning it on in production?"**
*Reveals whether the customer has the equivalent of Emmanuel's setup at all. Many do not, which is part of why they stall: they are learning the product on live traffic.*

**"When you first set up API Shield, did you point it at a real application or a test application?"**
*Customers who point it at a real application tend to move faster but are nervous about enforcement. Customers who want a test application usually do not have one and do not build one.*

**"Who in your organisation could answer the question 'what is the OpenAPI spec for this API?' right now, today?"**
*A proxy for whether schema validation will be a five-minute job or a five-month job. Digital-native teams can produce the file. Enterprise teams often cannot locate it.*

**"If you wanted to see what API Shield would flag on a specific endpoint, how would you generate traffic against that endpoint in a controlled way?"*
*Surfaces whether the team has any traffic-generation capability. Without it, they cannot iterate on rules before enforcement, and the adoption loop is extremely slow.*

**"How is the team that runs Cloudflare connected to the team that runs the API?"**
*Emmanuel's setup works because one person owns both. CartNova works because one designer owns both. In large customers this is rarely the case, and the seams between teams are usually where API Shield adoption stops.*

**"Which Cloudflare products do you already have on the zone where your APIs live?"**
*If the answer is "WAF, rate limiting, Bot Management" then API Shield is the natural next layer and the session-identifier prerequisites are probably already half-solved. If the answer is "nothing, we just use DNS," the prerequisites are a project in themselves.*

**"Have you ever seen a live demo of API Shield against an application that looks like yours?"**
*Almost every customer has seen the Petstore demo. Very few have seen a demo against something that resembles their own business. This question reveals the gap between "I understand the feature" and "I can picture using the feature."*

**"If the traffic going through API Shield stopped for a week, would you notice?"**
*A test of how load-bearing API Shield currently is in the customer's operations. A "no" answer means the product is installed but not integrated, which is the state most enterprise customers are in.*
