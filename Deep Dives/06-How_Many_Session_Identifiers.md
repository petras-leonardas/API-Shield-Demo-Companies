How Many Session Identifiers Do Customers Actually Need
-------------------------------------------------------


The one wristband question
--------------------------

The earlier deep dive on session identifiers used a music-festival wristband as the mental model: one band per attendee, one identifier per user, and API Shield gains the ability to tell requests apart. This piece asks the narrower question the first one skipped past. How many different wristband designs does a real customer actually need to print? One, because everyone is a normal ticket holder? Two, because staff need a different colour? Ten, because there are early-access tiers, VIP zones, press, catering, and artists? The count drives how long onboarding takes, how much of the product actually works, and which conversations a designer ends up having with the customer — and Cloudflare publishes almost nothing about it.

The short answer is that the typical customer needs exactly one identifier and in practice never touches the setting. The longer answer is that a small but important minority need a handful, and almost nobody ever bumps into the ceiling.


The default that carries most of the work
-----------------------------------------

If an API sends the `Authorization` header on more than one per cent of its successful requests to a Cloudflare zone, Cloudflare automatically sets that header as the session identifier. The customer does not click anything. They do not open a dashboard. The most common arrangement in the world of modern APIs — a single Bearer token or an API key sent in a single standard header — is handled on arrival. For these customers the answer to "how many identifiers do you need" is one, and the one is already configured.

CartNova is the clearest example. Thirty-seven endpoints, a single authentication mechanism for buyers, `Authorization: Bearer <JWT>` across the entire authenticated surface. Auto-detection will fire within a day of traffic reaching the zone and that is that. If the team wanted better accuracy across fifteen-minute token expiries, they could swap in the `sub` claim instead — still one identifier, just a more stable one. Five minutes of work, maximum.

This is genuinely the majority case. Digital-native customers with one auth model, one identity provider, and one team managing both are the reason the product ships with sensible defaults at all. The auto-detection is not a polite gesture. It is doing the heavy lifting for most of the customer base.


The two-to-three identifier band
--------------------------------

The next tier is customers who need to add one or two identifiers manually. Usually this happens because the zone mixes two populations that authenticate differently.

CartNova itself falls into this tier the moment seller traffic enters the picture. Sellers authenticate with `X-Seller-Key` rather than `Authorization`, and auto-detection does not recognise custom header names. To get accurate per-session analytics on seller endpoints, someone has to open the configuration panel, add `X-Seller-Key` as a second identifier, and save. The result is a zone with two identifiers live at once: the auto-detected `Authorization` for buyers, and the manual `X-Seller-Key` for sellers. Nothing routes between the two; both are evaluated on every request and whichever one is present on a given request is what Cloudflare uses to bucket it.

A payments processor might add a third for webhook traffic authenticated by HMAC signature header. A company that still supports a legacy API alongside a new one might add a fourth for the deprecated cookie that some customers are still sending. By the time a customer has three or four identifiers configured, they are deep in the minority. Most will never reach this shape.


The ceiling almost nobody hits
------------------------------

Cloudflare sets the limit at ten session identifiers per zone. This number is not published in the documentation. It surfaces only when a customer hits it, opens a support ticket, and asks for more.

In four years of deploying API Shield with customers, Emmanuel Francis has seen exactly one customer ask for the limit to be lifted. That customer was Kahoot. The product team said yes, technically possible, and Kahoot never came back — which most likely means they solved the problem differently once they looked at it again. One customer in four years is a rounding error. The ten-identifier limit is effectively invisible.

This tells a designer two things. The product is sized correctly; customers who genuinely need five or six identifiers are real and fit comfortably. And a customer who asks for more than ten is almost always describing a different problem than the one the product is designed to solve. Ten parallel auth systems on one zone is usually a symptom of an architectural mess that no security tool can tidy on its own. The right answer to "can I have fifty?" is "yes, but stop first and tell me what is going on."


Why the count is not the difficulty
-----------------------------------

The question "how many identifiers do I need" is easier than the question "which ones, and what should I type into the name field." Once the customer knows their auth model, configuring three identifiers takes three times as long as configuring one — which is to say, still under a minute. The real cost of onboarding is almost never the number of identifiers. It is figuring out what they are called.

Picture Emmanuel's lab with its Swagger Petstore, Juice Shop, Grafana, Kibana, and httpbin running as separate subdomains under one zone. Five applications, five different auth mechanisms, five teams in the imaginary enterprise behind them. The number of identifiers needed to cover the lab properly is four; httpbin has no auth at all. Four sits well under the ten-identifier ceiling. But the work is not in adding four rows to a configuration screen. It is in finding the four people who know which header or cookie each app uses, getting them onto a call, and agreeing on who owns the change when one of them rotates tokens six months later. The configuration is a minute. The prerequisites are a quarter.


Where the design falls short on count
-------------------------------------

Two design gaps are worth naming honestly.

Identifiers are zone-wide, not endpoint-scoped. A customer cannot say "use `Authorization` for the buyer endpoints and `X-Seller-Key` for the seller endpoints." Both apply everywhere, and whichever is present on a given request wins. For most customers this is fine. For enterprises consolidating several apps behind one hostname, it produces odd edges. Salt Security and Traceable AI support per-path identifier mapping; Cloudflare does not.

The ten-identifier limit is undocumented. A customer with seven configured and planning an acquisition that might add five more has no easy way to discover the ceiling in advance. Surfacing the number somewhere in the configuration panel — not as a warning, just as honest information — would save a small amount of enterprise grief.


The bottom line
---------------

Most API Shield customers need one session identifier and never touch the setting, because Cloudflare detects the `Authorization` header automatically. A meaningful minority need two or three because they run more than one auth mechanism on the same zone. Almost nobody ever reaches the undocumented ten-identifier ceiling; in four years of field deployments Emmanuel has seen one customer ask, and that customer never followed up. The number itself is rarely the problem. The problem is knowing, for each identifier, what to type into the name field — and that is a prerequisite the customer has to solve inside their own organisation before Cloudflare can help at all.


The vocabulary, summarised
--------------------------

- Session identifier — a piece of data inside each API request, usually a header, cookie, or JWT claim, that tells Cloudflare which user the request belongs to. Without one, Cloudflare cannot link multiple requests back to the same user.
- Zone — in Cloudflare, a domain and all its subdomains, treated as a single unit of configuration. Session identifiers are configured at the zone level.
- Auto-detection — Cloudflare's behaviour of automatically setting the `Authorization` header as a session identifier when that header appears on more than one per cent of successful requests to the zone.
- Bearer token — a credential sent in the `Authorization` header in the form `Bearer <token>`. The most common modern API auth pattern.
- JSON Web Token, known as JWT — a signed, structured token whose content can be read by Cloudflare once JWT validation is configured. Useful as a source of a stable session identifier via one of its claims.
- Claim — a named field inside a JWT, such as `sub` for subject or `email`, which can be used as a more stable identifier than the raw token string.
- HMAC signature — a cryptographic signature sent with a webhook request to prove the request came from a known sender. Often carried in a custom header and sometimes configured as an extra session identifier.
- Endpoint-scoped identifier — a configuration option, offered by some competitors but not by Cloudflare today, that lets a customer apply different session identifiers to different URL paths on the same zone.
- Ten-identifier limit — the undocumented maximum number of session identifiers a Cloudflare zone can have configured at one time. Extendable on request, almost never requested.


Questions worth asking customers
--------------------------------

- How many different ways does a client prove who they are when calling your APIs?
  - The number is the first-pass estimate of how many session identifiers will eventually be needed. One means auto-detection will probably handle it. Four or five means a real conversation with the teams that built each auth mechanism.

- Did you configure a session identifier yourself, or did it appear on its own?
  - If it appeared on its own, auto-detection is doing its job and the customer is on the happy path. If they configured it themselves, it is worth asking how long it took them to decide what to type into the name field, because that is where the friction actually lives.

- If you added another API to this zone tomorrow with a different auth mechanism, who in your company would decide what the session identifier should be called?
  - A single name and a quick answer signals a mature team. A list of names or a shrug signals an organisation where adding an identifier is a political act, not a technical one.

- Have you ever asked Cloudflare to raise a limit for session identifiers?
  - Almost no customer has. Any yes answer is interesting and usually signals a genuinely unusual architecture worth probing further.

- Do you know offhand how many session identifiers you currently have configured?
  - A customer who can name the exact number has been paying attention. A customer who says "a few" or "I would have to check" probably has identifiers left over from past projects nobody has audited recently.

- If one of your APIs started rejecting traffic tomorrow because its session identifier was wrong, would you know where to look in the dashboard?
  - The answer reveals whether session identifiers are a living part of the customer's operations or a setting that was configured once and forgotten.

- Are there APIs on this zone that you suspect are not being correctly bucketed per-session today?
  - Surfaces known gaps. A confident yes is good news because it means the customer already understands their coverage problem. A confident no is worth probing, because total coverage is rarer than customers assume.

- If you had to choose one API flow where per-session analytics would be most valuable, which would it be?
  - A triage question. Rather than solving the whole zone at once, pointing the conversation at the most valuable flow lets the customer see downstream features like Volumetric Abuse Detection light up, which builds the appetite to solve the rest later.
