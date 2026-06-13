# Docker Containers

## The ready meal in the hotel room

Imagine checking into a hotel and finding, on the desk, a sealed microwave meal. The packaging lists every ingredient. The cooking time is printed on the lid. You did not buy any of the ingredients, you are not using the hotel's kitchen, you are not borrowing pots from reception. You put the tray in the microwave, wait four minutes, and eat exactly the same dish the next guest would eat if they opened the same box. Crucially, when you are done, you throw away the tray and the room is spotless again. No cleaning up. No residue. No chance that tomorrow's guest finds a stray onion in the drawer.

A **Docker container** is that sealed meal. Emmanuel built his whole lab out of them — a Swagger Petstore, an OWASP Juice Shop, a Grafana, a Kibana — each one a pre-packaged meal he dropped into his **Virtual Private Cloud** (covered in the previous deep dive) and warmed up on demand. Understanding why containers exist, and why they matter so much to any conversation with an engineering team, is worth the short detour.

## Why they had to be invented

Before containers, shipping software to a server meant shipping a long list of assumptions. The software expected a particular operating system, a particular version of a programming language, a specific set of libraries, a database, a web server, certain files in certain folders with certain permissions. When the software worked on a developer's laptop but broke on the production server — the eternal *"it works on my machine"* complaint — it was almost always because one of those assumptions had drifted. The laptop had Python 3.10; the server had 3.8. The laptop had a library the server did not. Multiply that across hundreds of services and you have the problem that consumed most of the 2000s: servers were precious, hand-tuned, and impossible to reproduce.

One earlier answer to this was the **virtual machine** — a complete fake computer, with its own operating system, running inside a real one. That solved the reproducibility problem but was enormously wasteful. Each fake computer dragged around a full operating system, often several gigabytes, booted in minutes, and consumed as much memory as the real thing. Running twenty virtual machines on one server was a real stretch.

Containers came out of the observation that the thing most software actually needs is not a whole operating system. It needs its libraries, its files, its configuration, and a small patch of isolation from whatever else is running on the machine. Containers provide exactly that and nothing more. They borrow the host machine's operating system kernel — the core part that all programs share — and add only the specific bits the application needs on top. The result is something that feels like a virtual machine from the application's point of view but is two orders of magnitude lighter. A container can start in a second. You can run dozens on a laptop.

## How the pieces fit together

Three words get used interchangeably and shouldn't be.

An **image** is the recipe plus all the ingredients. It is a read-only template — nothing runs yet. Someone writes a file called a **Dockerfile** that lists the steps (*"start from Ubuntu, install Python, copy my code, expose port 8080"*), runs a build command, and out pops an image. Images live in a **registry**, which is simply a place on the internet where images are stored. **Docker Hub** is the biggest public one, free to browse, full of ready-made images for almost any piece of software you have heard of. When Emmanuel wanted the OWASP Juice Shop, he did not build an image — he pulled one someone else had already built, from a registry.

A **container** is what you get when you actually run the image. It is the microwaved meal, not the frozen tray. You can start a container, stop it, delete it, and start a fresh one from the same image in seconds. Two containers started from the same image are identical at the moment of launch — same operating system version, same libraries, same files. This is what makes Docker reproducible in a way nothing before it was.

**Docker Compose** is the last piece. A real application is rarely one container. A realistic e-commerce app might need a web server, a database, a cache, and a background worker — four containers that have to start in the right order and be able to talk to each other. Compose is a single text file that says *"run these four containers together, wire them up like this."* It is what Emmanuel uses to run his whole lab stack — one `docker-compose up` command and half a dozen pre-built applications spring to life, connected to each other and to his `cloudflared` tunnel.

## Why this matters for API Shield

Two specific reasons.

First, the vast majority of modern API workloads run inside containers. When your customers talk about *"our microservices"* or *"our Kubernetes cluster"* they are almost always describing a collection of containers, usually hundreds of them, orchestrated by a tool called **Kubernetes** that handles running containers at scale. CartNova is a rarity because it has only thirty-seven endpoints and runs on Cloudflare Workers; a more typical customer has thousands of endpoints spread across hundreds of containers spread across multiple Kubernetes clusters. The **discovery plateau** surfaced repeatedly in the research interviews — the moment enterprise customers open API Shield, see a thousand-plus endpoints, and don't know where to start — is, at the infrastructure level, a consequence of this: nobody has an inventory of the containers, so nobody has an inventory of the endpoints the containers expose.

Second, Cloudflare now sells **Containers** as its own product — a way to run a Docker container directly inside a Cloudflare Worker rather than inside a customer's cloud. It is new, currently only on the paid Workers plan, and designed for workloads that Workers alone cannot handle — things needing a full filesystem, a specific runtime, or heavy CPU work. Emmanuel mentioned it in his walkthrough as *"the equivalent of Docker at Cloudflare, just released."* It is not a replacement for a customer's existing Docker infrastructure — those customers have hundreds of thousands of containers inside their own Virtual Private Clouds — but it is a small beachhead Cloudflare is using to edge closer to the workload layer. Worth being aware of; not worth overselling.

## What the designer needs to see

Two things. The first is that a container is a unit of deployment, not a unit of business logic. One container can expose one endpoint, thirty endpoints, or none at all. When a customer tells you *"we have four hundred containers in production,"* that is almost uncorrelated with *"we have four hundred endpoints"* — the real number could be ten thousand. The second is that containers die and are replaced constantly. A container running today may not exist tomorrow, and a new one with a different identifier will have taken its place. Any security tool that tries to track endpoints by following individual containers will lose the thread within hours. API Shield avoids this problem by watching traffic at the edge rather than at the container — a deliberate design choice, and the right one, because endpoints are stable even when the containers serving them are not.

## The bottom line

A Docker container is a lightweight, pre-packaged copy of an application that runs the same everywhere. It solved the *"works on my machine"* problem so completely that it became the default way software is built and shipped, which is why almost every API customer you will talk to is describing a container-based system whether they say the word or not. For a designer, the important insight is not how containers work but what they imply: customers cannot enumerate their own endpoints because they cannot enumerate their own containers, and that single gap is most of the reason API Shield discovery exists at all.

---

### The vocabulary, summarised

| Term | What it means |
|------|---------------|
| Container | A self-contained, runnable copy of an application with everything it needs to work, isolated from whatever else is running on the same machine. |
| Image | The read-only template a container is launched from. An image is built once and can be run any number of times as identical containers. |
| Dockerfile | A plain-text recipe that describes how to build an image — what base to start from, what to install, what to copy in, what command to run. |
| Registry | An online storage location where images are kept and shared. Docker Hub is the largest public one. |
| Docker Hub | The public default registry, full of ready-made images for open-source software. Anyone can download from it; anyone can publish to it. |
| Docker Compose | A configuration file and tool for running several related containers together as one application, with one command. |
| Docker daemon | The background process on a machine that actually runs containers. You issue commands to it using the `docker` command-line tool. |
| Virtual machine | An older approach that runs a whole fake computer, including its own operating system, inside a real one. Heavier and slower than a container. |
| Kernel | The core part of an operating system that manages memory, processors, and hardware. Containers share the host machine's kernel; virtual machines do not. |
| Kubernetes | A system for running containers at scale across many machines — starting them, stopping them, moving them when servers fail, and keeping the right number alive. |
| Cloudflare Containers | Cloudflare's own product for running Docker containers on its edge network as part of a Worker. Currently available on the paid Workers plan. |
| Microservices | An architectural style where an application is built from many small, independent services, each typically running in its own container. |

### Questions worth asking customers

**"Roughly how many containers are running in production across your organisation today?"**
*A precise answer means the organisation has a container inventory system in place. A vague answer — "hundreds, maybe more" — is the same organisational shape that produces undiscovered endpoints.*

**"Are your APIs running on containers, virtual machines, serverless functions, or some combination?"**
*Establishes the shape of their runtime. Mixed environments are the norm at large companies and are the single biggest predictor of fragmented API discovery results.*

**"Do you use Kubernetes, and if so, how many clusters do you have?"**
*Kubernetes is the usual orchestrator at scale. More than one cluster almost always maps to more than one team, more than one network, and more than one security posture — all of which complicate API Shield rollout.*

**"When a new container is deployed to production, how do you know what endpoints it exposes?"**
*A deliberate, catalogued process means discovery findings can be cross-checked against the team's own records. An informal process means the team will rely on API Shield Discovery as their primary inventory — which changes the weight of getting it right.*

**"How often does a container in production get replaced, on average?"**
*Modern deployments redeploy many times a day. Legacy ones run the same containers for months. The answer sets expectations for how much endpoint churn the security tooling needs to keep up with.*

**"Do you run your own images, pull public images from Docker Hub, or both?"**
*Pulling public images is routine but carries supply-chain risk. This reveals how mature the customer's container governance is, which correlates with how carefully they will treat API Shield's findings.*

**"Is there a single registry where all your organisation's images live, or several?"**
*Single registry equals centralised governance. Multiple registries, especially one per business unit, means the same fragmentation you see at the API layer extending one level deeper into the infrastructure.*

**"If you had to turn off a specific container right now, could you find which team owns it in under five minutes?"**
*A brutal proxy for ownership clarity. A fast answer means the organisation can act on API Shield findings. A slow one means every finding becomes an archaeological project.*
