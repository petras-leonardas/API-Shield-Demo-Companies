# What is a Docker image?

> **Source:** Docker official documentation — *Get started → Docker concepts → The basics → What is an image?*
> **Publisher:** Docker Inc.
> **Type:** External reference (not authored by Emmanuel; shared alongside his wiki pages as background context)

---

## Explanation

Seeing as a container is an isolated process, where does it get its files and configuration? How do you share those environments?

That's where container images come in. A **container image** is a standardised package that includes all of the files, binaries, libraries, and configurations to run a container.

For a PostgreSQL image, that image packages the database binaries, config files, and other dependencies. For a Python web app, it includes the Python runtime, the app code, and all of its dependencies.

### Two important principles

- **Images are immutable.** Once an image is created, it can't be modified. You can only build a new image or add changes on top of it.
- **Container images are composed of layers.** Each layer represents a set of file system changes that add, remove, or modify files.

These two principles let you extend or add to existing images. If you are building a Python app, for example, you can start from the Python image and add additional layers to install your app's dependencies and add your code. This lets you focus on the app rather than Python itself.

---

## Finding images

**Docker Hub** is the default global marketplace for storing and distributing images. It has over 100,000 images created by developers that you can run locally. You can search Docker Hub and run images directly from Docker Desktop.

Docker Hub provides a variety of Docker-supported and endorsed images known as **Docker Trusted Content**. These provide fully managed services or good starting points for your own images, and include:

- **Docker Official Images** — a curated set of Docker repositories. They serve as the starting point for the majority of users and are among the most secure on Docker Hub.
- **Docker Hardened Images** — minimal, secure, production-ready images with near-zero CVEs (Common Vulnerabilities and Exposures), designed to reduce attack surface and simplify compliance. Free and open source under Apache 2.0.
- **Docker Verified Publishers** — high-quality images from commercial publishers verified by Docker.
- **Docker-Sponsored Open Source** — images published and maintained by open-source projects sponsored by Docker through Docker's open source program.

For example, **Redis** and **Memcached** are popular ready-to-go Docker Official Images — you can download them and have these services running in seconds. There are also base images, like the Node.js Docker image, that you can use as a starting point and add your own files and configurations. For production workloads needing enhanced security, Docker Hardened Images offer minimal variants of popular images like Node.js, Python, and Go.

---

## Try it out — using the GUI

In this hands-on, you will learn how to search for and pull a container image using the Docker Desktop GUI.

### Search for and download an image

1. Open the Docker Desktop Dashboard and select the **Images** view in the left-hand navigation menu.
2. Select the **Search images to run** button. If you don't see it, select the global search bar at the top of the screen.
3. In the **Search** field, enter `welcome-to-docker`. Once the search completes, select the `docker/welcome-to-docker` image.
4. Select **Pull** to download the image.

### Learn about the image

Once an image is downloaded, you can explore details about it through either the GUI or the CLI.

1. In the Docker Desktop Dashboard, select the **Images** view.
2. Select the `docker/welcome-to-docker` image to open its details.
3. The image details page shows information about the layers of the image, the packages and libraries installed in it, and any discovered vulnerabilities.

In this walkthrough, you searched and pulled a Docker image, and learned about its layers.

---

## Additional resources

The following resources help you learn more about exploring, finding, and building images:

- Docker trusted content
- Exploring the Image view in Docker Desktop
- Docker Build overview
- Docker Hub

---

## Next steps (in the original Docker docs)

Now that you have learned the basics of images, the Docker docs go on to cover distributing images through registries — *"What is a registry?"*.

---

## Why this page is in the "Emmanuel's setup" folder

This is an external reference, not an internal Cloudflare wiki page. Emmanuel shared it because:

- His lab is built almost entirely from Docker images pulled from Docker Hub (Swagger Petstore, OWASP Juice Shop, Grafana, Kibana, httpbin).
- His own setup wikis assume the reader already understands what an image is — this page fills that assumed knowledge.
- The **immutability** and **layers** concepts matter specifically for the API Shield lab because they explain why the same Petstore demo can be reproduced identically on any machine, any time, with no drift.

For a designer-friendly write-up of how this fits the broader API Shield project, see `Deep Dives/04-Docker_Containers.md`.
