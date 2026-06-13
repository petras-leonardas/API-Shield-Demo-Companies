# Virtual Private Clouds

## The office building with one locked door

Picture a modern office building — twenty floors, thousands of desks, its own lobby, its own post room. One company rents the whole thing. They do not own the land; they do not own the lift shafts; they do not pay for the cleaners. But inside that building, it is their business, their people, their rules. The front door has a pass reader. The windows do not open onto the street. A courier cannot walk in uninvited.

A Virtual Private Cloud, or **VPC**, is that building, but rented from Amazon, Google, or Microsoft and measured in computers instead of square metres. Emmanuel kept using the term throughout his walkthrough — *"I have a VPC, like the Google instance that Cloudflare gives you"* — because it is the default unit of infrastructure inside most large companies. Understanding what it actually means demystifies about half of the architectural conversations a designer is likely to be pulled into.

## What it replaced

Before the cloud, a company that wanted to run software bought computers, installed them in a room, cooled the room, cabled it, connected it to the internet, and hired someone to keep it running. That room was called a **data centre**. Everything inside it was on the company's own private network — the computers could talk to each other freely, and the outside world could only reach specific machines the company deliberately exposed.

Cloud computing broke that model. Amazon, Google, and Microsoft built enormous data centres and started renting slices of them by the hour. You no longer owned computers. You rented them. But this immediately raised an awkward question. If thousands of different companies were all renting computers from the same physical data centre, how do you stop a stranger's server from talking to yours?

The answer is the VPC. When you create one, the cloud provider draws a logical fence around the computers you rent — a **private network** only you can see. Your servers inside the VPC can talk to each other freely, the way the old in-house data centre used to work. Everything outside the fence is invisible by default. If you want any traffic from the public internet to reach a server in your VPC, you have to punch a specific, deliberate hole.

## The pieces inside

You do not need to memorise these, but four terms come up constantly and are worth recognising.

A **subnet** is a room inside the building. You divide your VPC into smaller address ranges so that the accounts team's servers can be kept apart from the marketing team's servers, even though they share the same building. A **security group** is the pass reader on each room's door, deciding which traffic is allowed through. A **public IP address** is a street address that the outside world can dial; a **private IP address** is an internal extension that only other rooms in the building can reach. Most servers in a well-run VPC have only private addresses, which is the whole point — if nothing can dial them from outside, nothing from outside can attack them.

## Why Emmanuel's demo lives in one

Emmanuel's lab is built on a VPC that Cloudflare gives its engineers on Google Cloud. Inside that VPC he runs a stack of **Docker** containers — the Swagger Petstore, the OWASP Juice Shop, Grafana, Kibana, and a few others. None of those containers has a public address. If you tried to reach them over the internet, you would find nothing. They are behind the locked front door.

The way he gets traffic in is **Cloudflare Tunnel**, a small piece of software called `cloudflared` that runs inside the VPC alongside the containers. It opens an outbound connection from the VPC to Cloudflare's network — the private-building equivalent of one employee walking out to the lobby and shouting "I am here, send me the post." No inbound ports are opened. The VPC's firewall stays completely closed. But once that outbound connection is established, traffic can flow in both directions through it, and Cloudflare can hand off public web requests to the containers inside.

This matters because it means Emmanuel can publish `petstore.<his-domain>` and `juice.<his-domain>` as real public URLs, sitting in front of real API Shield configuration, without ever exposing a single server to the open internet. The VPC is the safe room. The tunnel is the intercom.

## Why this is relevant to customers you will interview

Almost every enterprise customer has a VPC. Usually several. A typical financial services company might have one VPC per environment (production, staging, development), per region (EU, US, APAC), and per sensitive workload (payments in a tightly-locked VPC, marketing site in a loose one). It is not unusual to count forty or fifty of these across a single organisation, each with its own firewall rules, its own naming conventions, and its own team responsible for it. This is the reality under the phrase "our API surface is fragmented" — the APIs are fragmented because the VPCs they live in are fragmented, and the VPCs are fragmented because the teams that own them are fragmented.

CartNova, being four years old and digitally native, almost certainly has one or two VPCs on a single cloud provider. The whole engineering team has access. That is why their thirty-seven endpoints all live under one zone and speak one authentication language. The simplicity of their API Shield onboarding is really the simplicity of their VPC topology showing through.

## Where Cloudflare fits in this picture, honestly

Cloudflare sells against the VPC-centric worldview. The pitch — the one Emmanuel called *"SASE, where everyone is going"* — is that a VPC with its own firewall, its own VPN, its own intrusion detection, and its own bolt-on security vendors is the wrong shape for a company whose staff work from home and whose apps live in five clouds. Cloudflare's Zero Trust and Cloudflare One products are positioned to replace those VPC-era controls with edge-based ones.

But the honest version is that VPCs are not going anywhere for most of this decade. The workloads inside them — databases, legacy services, compliance-bound systems — are difficult and expensive to move. A realistic Cloudflare customer is running a hybrid: edge security from Cloudflare, origin infrastructure still firmly inside one or more VPCs, connected by tunnels. API Shield, specifically, operates at the edge and has no opinion about what lives behind it — VPC, raw server, Cloudflare Worker, it all looks the same from Cloudflare's side. That is why Emmanuel's VPC-behind-a-tunnel setup and CartNova's no-VPC-at-all setup both work equally well as demo environments, as covered in the previous deep dive.

## The bottom line

A VPC is the private floor a company rents inside someone else's data centre. It is where almost every enterprise customer's APIs actually live, and the shape of their VPCs — how many, how separated, how messy — tends to dictate how messy their API Shield onboarding will be. Emmanuel runs his demo inside one because that is how real customers are built; CartNova skips it because a designer building a lab from scratch has no reason to take on the complexity. Both are valid. Neither is the future Cloudflare is selling.

---

### The vocabulary, summarised

| Term | What it means |
|------|---------------|
| Data centre | A building full of computers that a company uses to run its software. In the old model, companies owned their own; in the cloud model, companies rent space in someone else's. |
| Cloud provider | A company such as Amazon Web Services, Google Cloud, or Microsoft Azure that rents out computing capacity by the hour. |
| Virtual Private Cloud (VPC) | A private, logically fenced-off slice of a cloud provider's data centre. Your servers inside the fence can talk to each other but are invisible to the outside world by default. |
| Private network | A network where servers can only be reached from inside the same network, not from the public internet. |
| Subnet | A smaller address range inside a VPC, used to keep different groups of servers separated from each other. |
| Security group | A rule set that decides which traffic is allowed to reach each server inside a VPC — effectively a firewall attached to an individual machine. |
| Public IP address | A numeric address that anyone on the internet can dial. Servers that receive traffic from the public need one. |
| Private IP address | A numeric address that only other servers inside the same network can dial. Most servers in a well-run VPC only have one of these. |
| Firewall | A device or piece of software that decides which network traffic is allowed through a boundary. Every VPC has at least one. |
| Docker container | A self-contained, runnable package of an application. Several containers typically run together inside a VPC. |
| Cloudflare Tunnel / `cloudflared` | A small program that runs inside a VPC and opens an outbound connection to Cloudflare's network, letting traffic flow in and out without opening any inbound port on the VPC's firewall. |
| Zero Trust / SASE | Cloudflare's family of products that aim to replace VPN and perimeter-based security with edge-delivered, identity-based controls. SASE stands for Secure Access Service Edge. |
| Hybrid architecture | The common real-world shape where some of a company's workloads run on Cloudflare's edge and some still run inside traditional VPCs, connected by tunnels. |

### Questions worth asking customers

**"How many VPCs does your organisation have, roughly, and do you know who owns each one?"**
*A clean answer ("one per environment, three total, the platform team owns them") is a sign of a digital-native team. A vague answer ("I am not sure, dozens maybe, different teams") is the best early indicator that API Shield adoption will run into cross-team friction.*

**"Which cloud provider hosts the APIs that are in scope for this project?"**
*Tells you the vocabulary to expect ("AWS VPC", "GCP VPC network", "Azure Virtual Network" — the same concept under three names) and reveals whether the customer is single-cloud or multi-cloud. Multi-cloud almost always means more fragmented API surfaces.*

**"When a new API needs to be exposed to the internet, who decides which VPC it lives in and how traffic reaches it?"**
*Surfaces the decision-making structure. A single platform team means fast, consistent decisions. A per-business-unit model means every new API is a small political negotiation, and shadow APIs are much more likely.*

**"Do your APIs live behind a traditional perimeter firewall, a cloud load balancer, Cloudflare, or some combination?"**
*Establishes how many layers of edge already sit in front of the origin. Customers with three or four layers — hardware firewall, then cloud load balancer, then a WAF vendor, then Cloudflare — often cannot explain why each one is there, which is a useful signal about how the current setup evolved.*

**"Are there APIs running inside VPCs today that are not yet behind Cloudflare?"**
*A direct question about shadow API surface. Most customers will admit to some. The honest ones will admit to a lot. The answer points directly at which teams need to be pulled into the conversation.*

**"If Cloudflare Tunnel went offline tomorrow, what would break?"**
*Works only if they are already using tunnels. A detailed answer ("these seventeen internal apps would become unreachable") is a sign of a mature Zero Trust deployment. A shrug is a sign that tunnels were set up once and forgotten.*

**"Who in your organisation would need to approve moving an API out of its VPC and onto Cloudflare's edge?"**
*The number of names is the number of weeks. One name means one conversation. Five names means a steering committee. This question almost always reveals the real bottleneck to adoption.*

**"Have you or your team ever decommissioned a VPC, and what was involved?"**
*Almost no one has. That answer is itself the insight: VPCs accrete, they do not retire. The sprawl you are seeing in their API Shield Discovery view is the same sprawl, one level down.*
