---
description: Write one or more deep dives on API Shield topics
---

You are writing deep dive documents for a series called "Deep Dives" inside this API Shield demo project. The audience is a non-technical designer at Cloudflare who is intelligent and curious but not an engineer.

The topic(s) for this deep dive: $ARGUMENTS

---

## Step 0 — Detect single vs. multiple topics

Read `$ARGUMENTS` carefully. The user may request one topic or several.

Multiple topics are indicated by:
- Comma separation, for example: BOLA, schema validation, JWT
- Numbered list, for example: 1. BOLA 2. schema validation
- The word "and" between distinct topics, for example: BOLA and schema validation

If there are multiple topics, you must create a separate deep dive file for each topic. Follow Steps 1-3 independently for every topic, numbering them sequentially.

---

## Step 1 — Determine the file number

Count the existing numbered deep dive files and increment by one:

!`ls "Deep Dives/" | grep -E "^[0-9]" | wc -l | tr -d ' '`

Add 1 to that number to get the next file number. For example, if there are 3 files, the next is 4. The filename should be zero-padded to 2 digits: `04-Topic_Name.md`. Use a dash after the number and underscores with title case for the topic portion of the filename.

Examples: `01-Session_Identifiers.md`, `02-BOLA.md`, `03-Schema_Validation.md`

When creating multiple deep dives in a single run, number them sequentially. For example, if 3 exist, the next three would be `04-...`, `05-...`, `06-...`.

---

## Step 2 — Research before writing

Do not write anything until you have read the relevant source material. Work through the following in order:

### Cloudflare docs (primary source of truth)

Fetch the relevant Cloudflare API Shield documentation page(s) for the topic using WebFetch. The docs live under `https://developers.cloudflare.com/api-shield/`. Key pages include:

- Discovery: `https://developers.cloudflare.com/api-shield/security/api-discovery/`
- Endpoint Management: `https://developers.cloudflare.com/api-shield/management-and-monitoring/endpoint-management/`
- Endpoint Labels: `https://developers.cloudflare.com/api-shield/management-and-monitoring/endpoint-labels/`
- Schema Learning: `https://developers.cloudflare.com/api-shield/management-and-monitoring/endpoint-management/schema-learning/`
- Schema Validation: `https://developers.cloudflare.com/api-shield/security/schema-validation/`
- JWT Validation: `https://developers.cloudflare.com/api-shield/security/jwt-validation/`
- mTLS: `https://developers.cloudflare.com/api-shield/security/mtls/`
- Session Identifiers: `https://developers.cloudflare.com/api-shield/management-and-monitoring/session-identifiers/`
- Authentication Posture: `https://developers.cloudflare.com/api-shield/security/authentication-posture/`
- Volumetric Abuse Detection: `https://developers.cloudflare.com/api-shield/security/volumetric-abuse-detection/`
- Sequence Analytics: `https://developers.cloudflare.com/api-shield/security/sequence-analytics/`
- Sequence Mitigation: `https://developers.cloudflare.com/api-shield/security/sequence-mitigation/`
- BOLA Detection: `https://developers.cloudflare.com/api-shield/security/bola-vulnerability-detection/`
- Vulnerability Scanner: `https://developers.cloudflare.com/api-shield/security/vulnerability-scanner/`
- Sensitive Data Detection: `https://developers.cloudflare.com/api-shield/management-and-monitoring/endpoint-management/`
- GraphQL Protection: `https://developers.cloudflare.com/api-shield/security/graphql-protection/`
- API Routing: `https://developers.cloudflare.com/api-shield/management-and-monitoring/api-routing/`
- Developer Portals: `https://developers.cloudflare.com/api-shield/management-and-monitoring/developer-portal/`
- Getting Started: `https://developers.cloudflare.com/api-shield/get-started/`

Fetch the page(s) most relevant to the topic. If the topic spans multiple features, fetch multiple pages. If the topic is broader than a single feature (e.g. "positive security model", "API discovery plateau"), fetch the most relevant pages and supplement with general web research.

### Project files to search

Read the following files for context relevant to the topic:

- `shared/feature-test-map.md` — Maps every API Shield feature to specific test scenarios for CartNova and the planned Emmanuel-style lab. Check for the section(s) matching the topic.
- `AGENTS.md` — Project overview, research findings, company description, and key context.
- `cartnova/api-architecture.md` — CartNova's clean endpoint inventory, auth model, and data flows. Use as the "digital-native happy path" example.
- `cartnova/company-profile.md` — CartNova's business model and why they adopted API Shield.
- `Emmanuel's setup/transcript.md` — Emmanuel Francis's walkthrough of his own API Shield lab. Use as the reference for the enterprise-sprawl scenario; this is the approach that replaced the abandoned MeridianBank company.
- `Emmanuel's setup/wiki-02-securing-apis-with-jwt-validation.md` and `wiki-03-implementing-jwt-validation-for-petstore-swagger-api.md` — Emmanuel's internal wiki pages on JWT validation against the Swagger Petstore, including his traffic-generator and JWT-generation scripts.

You do not need to read all files for every topic — read only the ones relevant to the subject. But always read the Cloudflare docs page(s) and the feature-test-map entry.

---

## Step 3 — Write the deep dive

Save the completed file to `Deep Dives/NN-Topic_Name.md`.

---

## Output formatting rules — these override everything else

The finished deep dive file must follow these rules without exception. These apply to the document you are writing, not to this command file itself.

- Do not use the character `#` anywhere in the output. No Markdown headings of any kind. Section titles must be written as plain text lines on their own, with a blank line above and below. You may underline a title with a row of dashes on the next line if you want visual separation, but no hashes.
- Do not use the character `*` anywhere in the output. No bold, no italic, no bulleted lists using asterisks. If you need a list, use a dash followed by a space at the start of the line, or write the items in prose. If you want emphasis, rewrite the sentence so the word carries weight on its own.
- Do not use parentheses `(` or `)` anywhere in the output. Zero parenthesis characters in the final file. Any aside, clarification, acronym expansion, or example that you would normally put in parentheses must be rewritten into the sentence using commas, dashes, or a separate sentence. Spell out acronyms inline the first time they appear, for example write "Broken Object Level Authorization, known as BOLA" rather than "BOLA (Broken Object Level Authorization)".
- Do not use tables anywhere in the output. No Markdown tables, no pipe characters used to draw columns, no ASCII tables. Any content you might be tempted to put in a table must be written as prose or as a dash-led list. The pipe character `|` should not appear in the final file at all.

Before saving the file, scan it once for any `#`, `*`, `(`, `)`, or `|` characters and rewrite those passages until none remain.

---

## Length and density

Each deep dive should be 800 to 1200 words, excluding the vocabulary summary and the questions section. This is roughly a 4 to 6 minute read. Aim for density over length — every sentence should earn its place. Cut anything that restates the obvious or adds padding.

- Prefer one sharp paragraph over three that circle the same point
- One concrete example is enough to illustrate a concept — do not stack multiple examples making the same point
- The vocabulary summary and the questions section are in addition to the word count, not included in it

---

## Style rules — follow these strictly

Audience and tone:
- Written for a non-technical designer who is intelligent but not an engineer
- Blog-post tone throughout — conversational, direct, human
- Never clinical, never a list of bullet points as the primary form of explanation
- Write in flowing prose; use dash-led lists only for genuinely list-like content such as the vocabulary summary or the closing questions. Never use tables, even for comparisons — convert any comparison into prose

Building concepts:
- Always build from first principles — assume the reader knows nothing about the topic
- Introduce a plain-English analogy or real-world scenario before any technical explanation
- Define every piece of jargon the first time it appears, either inline or in the vocabulary summary
- Never use an acronym without first spelling it out in full, and do it without parentheses

Grounding in reality:
- Illustrate key claims with a concrete scenario — one example per concept is sufficient
- CartNova is the digital-native with 37 clean endpoints and a single auth model, and represents the happy path
- For the enterprise-sprawl scenario, reference Emmanuel Francis's lab as documented in `Emmanuel's setup/`. It uses a `cloudflared` tunnel into a VPC running off-the-shelf Docker images — Swagger Petstore, OWASP Juice Shop, Grafana, Kibana, httpbin — each published as a subdomain. This stands in for an enterprise with multiple apps and fragmented auth under a single Cloudflare zone.
- Where earlier deep dives reference a "MeridianBank" enterprise customer, treat those as legacy references to the same enterprise-sprawl archetype. New deep dives should use Emmanuel's lab or a generic enterprise framing instead.
- You do not need to use both a digital-native and enterprise angle for every point — pick whichever makes the concept clearest.

Honesty about Cloudflare:
- Describe strengths and weaknesses with equal honesty — do not soften or omit gaps
- Where competitors offer something Cloudflare doesn't, say so briefly and move on
- Never write promotionally

Connecting to the series:
- Where relevant, briefly reference other deep dives, for example: as covered in the BOLA deep dive
- Check which deep dives already exist in `Deep Dives/` so cross-references are accurate

---

## Mandatory closing sections

Every deep dive must end with these two sections, in this order. Write the section titles as plain text lines, with no hashes, no asterisks, and no parentheses.

The vocabulary, summarised
A plain list covering every piece of jargon introduced in the document. Do not use a table of any kind. Write each entry on its own line as a dash-led item in the form: Term — plain-English definition. Use an em dash between the term and its definition. One or two sentences maximum per entry.

Questions worth asking customers
A list of 6 to 8 diagnostic questions a designer or researcher could ask in a customer conversation to surface the real dynamics around this topic. Write each question as a dash-led line. Below each question, on its own indented dash-led line, add a short note explaining what the answer typically reveals. Do not use italics and do not use parentheses; the note is plain text.

---

## What to avoid

- Do not start any section with a generic title like Introduction, Overview, or Background
- Do not use emojis anywhere in the document
- Do not write a closing section called Conclusion. End with a section titled "The bottom line" that states the single most important takeaway clearly and directly
- Do not pad with vague generalities — every paragraph should contain a specific, useful insight
- Do not write promotionally about Cloudflare — honest and accurate is always better
- Do not include links to Cloudflare docs pages in the document
- Do not use the characters `#`, `*`, `(`, `)`, or `|` anywhere in the output file
- Do not use tables of any kind — prose and dash-led lists only
