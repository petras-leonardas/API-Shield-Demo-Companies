# Implementing JWT Validation for Petstore Swagger API

> **Source:** Internal Cloudflare Wiki, under Products Best Practices → Application Security → API Shield.
> **Author:** Emmanuel Francis
> **Last updated:** 2024-12-27
> **Read time:** ~3 minutes
> **Views at time of capture:** 120

---

## Purpose

Provide a step-by-step guide to configure JSON Web Token (JWT) validation for the Petstore Swagger API, enhancing security by ensuring that only authorised users can access protected endpoints.

---

## Prerequisites

- Access to the Petstore Swagger API.
- Administrative access to Cloudflare for uploading JSON Web Keys (JWKs) and configuring session identifiers.
- A Python environment for generating JWTs.

---

## Procedure

### Step 1 — Generate a JWT online

- Use an online tool to create a JWT for testing purposes.
- Ensure the token includes the claims required by your API.

### Step 2 — Save cryptographic materials

Save the following securely:

- Public JWK.
- Private key.
- Public key PEM.

### Step 3 — Upload the JWK to Cloudflare (obtained in Step 1)

1. Log in to the Cloudflare dashboard.
2. Navigate to the **API Shield** section.
3. Upload the saved JWK so Cloudflare can validate JWTs signed with the corresponding private key.

### Step 4 — Generate a new JWT using a Python script

Use a Python script to generate a fresh JWT:

- The script must use the saved private key for signing.
- Verify that the token includes the appropriate claims.

The companion wiki *Securing APIs with JWT Validation Using Cloudflare* (captured in this folder as `wiki-02-securing-apis-with-jwt-validation.md`) includes the Python script Emmanuel uses to generate tokens.

To verify a generated token, paste it — along with the corresponding private key — into [JWT.io](https://jwt.io) and confirm that the signature is valid.

### Step 5 — Configure the Cloudflare Session Identifier

In the Cloudflare dashboard:

1. Navigate to the **Session Identifier** settings.
2. Add a new identifier with:
   - **Type:** JWT Claim

### Step 6 — Test the configuration

1. Open the Petstore Swagger UI.
2. Enter the generated JWT into the `api_key` field for a protected endpoint.
3. Execute the API call:
   - A successful response indicates the configuration is correct.
   - An error response means one of the previous steps needs troubleshooting.

Emmanuel's wiki includes illustrations of both an error and a successful request. After generating a fresh token from his Python script and pasting it into the Petstore UI, re-executing the request returned a successful response.

---

## 6. Safety and security considerations

- Store all cryptographic materials securely to prevent unauthorised access.
- Rotate keys regularly and update the JWK in Cloudflare accordingly.

---

## 7. References

- Cloudflare API Shield documentation.
- Python JWT library documentation.

---

## 8. Revision history

| Version | Date | Change | Author |
|---------|------|--------|--------|
| 1.0 | 2024-12-23 | Initial creation | Emmanuel Francis |
| 1.1 | 2024-12-27 | Illustration added | Emmanuel Francis |

---

*Two people liked this page on the wiki. No labels attached.*
