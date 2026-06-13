---
description: Generate a FigJam diagram from a description, using the Taco Truck MCP integration
---

You are generating a FigJam diagram inside the user's Cloudflare Figma organisation, using the `taco-truck_generate_diagram` tool. The output is a visual, editable whiteboard — not a markdown file, not a static image.

The request: $ARGUMENTS

---

## Step 0 — Parse the request

Read `$ARGUMENTS` and identify:

- **Subject** — what the diagram is about (e.g. "the CartNova traffic generator flow", "the Emmanuel-style lab", "the JWT validation demo").
- **Style (if specified)** — architecture diagram, sequence/flow, state machine, timeline, decision tree. If the user does not specify, infer from the subject:
  - Architecture, components, systems, how things fit together → `flowchart LR`
  - Step-by-step demo, API call, request/response, time-ordered interaction → `sequenceDiagram`
  - States and transitions (e.g. an endpoint moving through log mode to enforcement) → `stateDiagram-v2`
  - Timeline, phases, schedule → `gantt`
- **Audience** — default is the project owner, Leo, a non-technical designer. Adjust density accordingly.

Only ask a clarifying question if the request is genuinely ambiguous and cannot be answered with a sensible default. Do not pepper the user with questions for every request. When in doubt, produce a diagram and let the user iterate by running the command again.

---

## Step 1 — Ground the diagram in real project context

Do not invent architecture. Read the relevant source material before drafting the Mermaid:

- `AGENTS.md` — project overview, deployed services, traffic generator details, the company description.
- Any files named or clearly implied in the user's request (e.g. if they mention Emmanuel's setup, read the files in `Emmanuel's setup/`; if they mention a deep dive, read the relevant `Deep Dives/NN-*.md` file).
- `shared/feature-test-map.md` and `shared/project-plan.md` for feature-level detail if the subject involves API Shield features.
- `cartnova/api-architecture.md` for endpoint structure.

Read only what's relevant to the subject. Do not read every file for every diagram.

If the diagram involves infrastructure or architecture decisions that are open or pending (e.g. which host to use for the Emmanuel-style lab), reflect the current state — either the committed decision or clearly showing "decision pending" in the node.

---

## Step 2 — Pick the Mermaid diagram type

Taco Truck's `generate_diagram` tool supports these types only:

- `graph` / `flowchart` (same thing; prefer `flowchart`)
- `sequenceDiagram`
- `stateDiagram` / `stateDiagram-v2` (prefer v2)
- `gantt`

It does NOT support: class diagrams, ER diagrams, venn diagrams, timelines (use `gantt`), mindmaps, pie charts.

Rules of thumb:

- **Architecture / data flow / how components connect** → `flowchart LR` (left-to-right, which matches how people read).
- **An ordered interaction across participants** → `sequenceDiagram`.
- **An object moving through states** → `stateDiagram-v2`.
- **A phased plan with dates** → `gantt`.

If the request really needs an unsupported type, produce the closest supported approximation and say so in your response.

---

## Step 3 — Draft the Mermaid syntax

Follow these rules strictly, because Taco Truck's diagram tool rejects or mangles output that breaks them:

**Shape and labels:**
- For `flowchart`/`graph`, use `LR` (left-to-right) as the default direction unless the subject is clearly vertical.
- Put all shape text and edge labels in quotes: `A["Node label"]`, `A -->|"Edge label"| B`.
- Keep node labels tight — 1 to 5 lines, using `<br/>` for line breaks. Put details in the surrounding text of your response, not inside nodes.
- Do not use `\n` for newlines inside nodes; use `<br/>`.
- Do not use emojis anywhere in the Mermaid code.
- Do not use the word `end` inside class names or node IDs (Mermaid reserved word).
- Use subgraphs to group related nodes (e.g. all things inside a VPC, all things on Cloudflare's edge).

**Cloudflare-branded colour palette** (use sparingly — do not colour every node):

- Edge / API Shield / Cloudflare platform → fill `#F48120`, stroke `#B85D00`, text `#FFFFFF`
- Cloudflare Workers (lighter variant) → fill `#FEF5E7`, stroke `#F48120`, text `#333333`
- API Shield detail nodes (muted orange) → fill `#FFD89A`, stroke `#B85D00`, text `#333333`
- Tunnels / encrypted paths / Zero Trust → fill `#F0E5FF`, stroke `#6F42C1`, text `#333333`
- Infrastructure / VPC / host machines → fill `#E8F4FD`, stroke `#0366D6`, text `#333333`
- Neutral / public internet / unstyled default → fill `#F6F8FA`, stroke `#6A737D`, text `#333333`

Apply styles either via `style` lines or `classDef` + `class` assignments. Only colour subgraphs and semantically-meaningful nodes — leave ordinary steps and edge labels uncoloured.

**Sequence diagrams specifically:**
- Do not use `Note over` — the tool rejects notes.
- Use `autonumber` at the top if the sequence has more than three steps.
- Keep participant labels short (`CF` is better than `Cloudflare edge` as a participant ID, then use `as` to give it a longer display name: `participant CF as Cloudflare edge`).

**Gantt charts specifically:**
- Do not apply colour styling — the tool rejects it on gantt.

---

## Step 4 — Call the diagram tool

Call `taco-truck_generate_diagram` with:

- `name` — a short, descriptive title for the Figma file. Example: `"Emmanuel-style lab — architecture"`, `"JWT validation demo — sequence"`, `"API Shield onboarding — state machine"`. Title case, no trailing period.
- `mermaidSyntax` — the drafted Mermaid from Step 3.
- `userIntent` — one plain-English sentence describing what the diagram shows and who it's for. Do not include extraneous marketing language.
- `planKey` — `organization::700453401166494924` (the Cloudflare organisation key for this account). This is fixed for this project.

---

## Step 5 — Return the diagram to the user

Respond with:

1. The FigJam URL as a clickable markdown link. This is required — it's how the user opens the diagram.
2. A single short paragraph describing what's on the diagram — the main zones or participants, the flow direction, and any deliberate simplifications or omissions. Do not repeat what the diagram already shows visually; instead, highlight what the user should look at first.
3. Optionally, a one-line note on what the diagram deliberately does not show and why (e.g. "I skipped the traffic generator Worker because it's not relevant to the architecture question you asked.").
4. An offer to regenerate with adjustments if the result isn't right — for example different orientation, fewer nodes, more detail on a specific layer, or a different diagram type.

Do not paste the Mermaid syntax back to the user unless they explicitly ask for it. The whole point of the command is that they get a visual, not code.

---

## What to avoid

- Do not create a markdown file as a side-effect. This command produces only a FigJam diagram in Figma; nothing is saved to the repo.
- Do not fabricate architecture. If you don't know how something is wired up in this project, read the source files before drafting. If you still don't know, say so and ask.
- Do not stack multiple diagrams into a single call. `generate_diagram` creates one diagram per call. If the user's request genuinely needs two (e.g. architecture plus sequence), create both with two separate tool calls and return both URLs.
- Do not use colour for decoration. Colour should carry meaning — zones, layers, protocol type. A rainbow diagram is a broken diagram.
- Do not use more than around 30 nodes in a single flowchart. If the subject is too big, simplify or split.
- Do not write promotional language in `userIntent` or node labels. Plain description only.
