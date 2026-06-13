# Securing APIs with JWT Validation Using Cloudflare

> **Source:** Internal Cloudflare Wiki, under Products Best Practices → Application Security → API Shield.
> **Author:** Emmanuel Francis
> **Last updated:** 2024-12-23
> **Read time:** ~5 minutes
> **Views at time of capture:** 124

---

## Introduction

This guide explains how to secure an API by configuring Cloudflare's API Gateway to validate JWT tokens. It covers generating tokens, uploading public keys to Cloudflare, and testing with traffic generation scripts.

### Prerequisites

Use this link to prepare and configure your setup: *How to setup your own API Shield DEMO from Start to Finish!* (internal wiki — separate page).

- Cloudflare account with API Gateway enabled.
- Public/private key pair for JWT.
- Python 3 installed on your local machine.
- API schema or a list of endpoints.

---

## Planning the setup

Emmanuel uses a Debian server with the Swagger Petstore API Docker container deployed behind a `cloudflared` tunnel, following the setup in the prerequisite wiki.

To better understand the concepts and workflows involved, he has customised the setup as follows.

### Traffic generation using a custom script

Instead of relying on tools like Apache JMeter, Emmanuel wrote a custom traffic generator as a Bash script. It dynamically sends requests to the Swagger Petstore endpoints with randomised parameters and headers, simulating real-world traffic. This approach gives more flexibility to control behaviour, test edge cases, and observe how traffic flows interact with the Cloudflare configuration.

### JWT token generation

A Python script generates JWT tokens. It uses a private key stored locally to sign tokens, which are then sent as headers in API requests. The JWTs include claims such as `iss` (issuer), `aud` (audience), and `exp` (expiration time), ensuring secure, time-bound access to the API. These tokens are validated at the Cloudflare edge against a public key (JSON Web Key) uploaded to the API Shield configuration.

### Folder structure and resource management

Files are mounted inside Visual Studio Code for ease of development. Suggested layout:

```
root-folder/
├── traffic-generator/
│   ├── traffic_generator.sh
│   ├── traffic_generator.py
│   ├── endpoints.csv
│   └── users.csv
├── jwt-tools/
│   ├── generate_jwt.py
│   ├── private_key.pem
│   ├── public_key.json
└── cloudflare-config/
    ├── api_schema.yaml
    ├── public_key_uploaded_to_cloudflare.json
    └── waf_rules.json
```

---

## The traffic generator (Bash)

```bash
#!/bin/bash

# Set PATH if needed
export PATH=/usr/local/bin:/usr/bin:/bin
domain="petstore.api.vefnetworks.com"
iterations=50000

# Activate virtual environment
source /Users/emmanuelfrancis/Script/traffic-sequence/.venv/bin/activate

# Function to generate a new JWT token
generate_jwt() {
  jwt_token=$(python3 /Users/emmanuelfrancis/Script/traffic-sequence/gen-jwt-es256.py)
  echo $jwt_token
}

# Dynamically fetch the token
jwt_token=$(generate_jwt)

# List of API endpoints with placeholders for random IDs
endpoints=(
  "/api/v3/store/inventory"
  "/api/v3/user/login?username=test_user&password=mockpass"
  "/api/v3/user/logout"
  "/api/v3/pet/findByStatus?status=available,pending,sold"
  "/api/v3/pet/findByTags?tags=tag1,tag2"
  "/api/v3/pet"
  "/api/v3/pet/{var}"                    # Random ID to be substituted
  "/api/v3/store/order/{var1}"           # Random order ID
  "/api/v3/user/{var1}"                  # Random user ID
  "/api/v3/pet/{var1}/uploadImage"       # Random pet ID
)

# List of headers to simulate
headers=(
  "Authorization: $jwt_token"
  ": $jwt_token"
  "jwt: $jwt_token"
  "Content-Type: application/json"
  "x-user-id: user-${RANDOM}"
  "x-session-id: session-${RANDOM}"
)

# Helper to choose a random header
random_header() {
  echo "${headers[RANDOM % ${#headers[@]}]}"
}

# Helper to choose a random endpoint and replace {var} or {var1} with random ID
random_endpoint() {
  endpoint="${endpoints[RANDOM % ${#endpoints[@]}]}"
  if [[ "$endpoint" == *"{var}"* || "$endpoint" == *"{var1}"* ]]; then
    random_id=$((RANDOM % 100 + 1))  # Generate random ID between 1 and 100
    endpoint=${endpoint//\{var\}/$random_id}
    endpoint=${endpoint//\{var1\}/$random_id}
  fi
  echo "$endpoint"
}

# Generate traffic
for ((i=1; i<=$iterations; i++)); do
  echo "Running iteration $i"

  # Pick a random endpoint and headers
  endpoint=$(random_endpoint)
  header1=$(random_header)
  header2=$(random_header)

  # Simulate GET request
  /usr/bin/curl -X GET -H "$header1" -H "$header2" "https://${domain}${endpoint}" &

  # Simulate POST request if applicable
  if [[ "$endpoint" == *"/api/v3/store/order"* ]] || [[ "$endpoint" == *"/api/v3/pet"* ]]; then
    /usr/bin/curl -X POST -H "$header1" -H "$header2" -d '{"id":1,"name":"mock"}' "https://${domain}${endpoint}" &
  fi

  # Simulate PUT request if applicable
  if [[ "$endpoint" == *"/api/v3/user/{var1}"* ]] || [[ "$endpoint" == *"/api/v3/pet/{var1}"* ]]; then
    /usr/bin/curl -X PUT -H "$header1" -H "$header2" -d '{"id":1,"name":"updated"}' "https://${domain}${endpoint}" &
  fi

  # Simulate DELETE request if applicable
  if [[ "$endpoint" == *"/api/v3/store/order/{var1}"* ]] || [[ "$endpoint" == *"/api/v3/user/{var1}"* ]]; then
    /usr/bin/curl -X DELETE -H "$header1" -H "$header2" "https://${domain}${endpoint}" &
  fi

  # Wait briefly between requests to avoid overloading
  sleep 0.5

  # Refresh JWT token every 100 iterations
  if (( i % 100 == 0 )); then
    jwt_token=$(generate_jwt)
    headers[0]="jwt: $jwt_token"
  fi

done

echo "Traffic generation complete."
```

### What the script does

- Dynamically generates HTTP requests to the API endpoints listed inline.
- Each request carries randomised headers (`x-user-id`, `x-session-id`) and uses JWT tokens in the `Authorization` header.
- The script contains mock user data used to populate query parameters for specific endpoints (e.g. login or user creation).

---

## JWT token management

### The generator (Python)

```python
import time
from authlib.jose import jwt

# Load the private key from the PEM file
with open("ec_private_key.pem", "rb") as key_file:
    private_key = key_file.read()

# Define the JWT header
header = {
    "alg": "ES256",
    "kid": "petstore-es256"   # Ensure this matches the 'kid' in your key
}

# Define the JWT payload
payload = {
    "iss": "https://petstore.api.vefnetworks.com",  # Issuer
    "aud": "petstore",                              # Audience
    "sub": "user123",                               # Subject
    "exp": int(time.time()) + 3600                  # Expiration time (1 hour from now)
}

# Encode the JWT
token = jwt.encode(header, payload, private_key)
print(f"Generated ES256 JWT:\n{token.decode('utf-8')}")
```

### How it fits together

- `generate_jwt.py` creates a new token whenever the existing token expires.
- It reads the private key stored locally in `private_key.pem`, builds a payload with claims, and signs it using the **ES256** algorithm.
- This ensures compatibility with the public key uploaded to Cloudflare's API Shield.

---

## Traffic generation — summary

The final traffic generator script:

- Dynamically selects and hits endpoints listed inside the script itself (not read from an external CSV).
- Uses a predefined list of endpoints and randomises IDs where placeholders like `{var}` and `{var1}` appear.
- Produces consistent and automated traffic against specific API paths defined directly in the script.

---

## Cloudflare integration

- The public JWK uploaded to Cloudflare's API Shield is used to validate JWTs generated locally.
- WAF rules are configured to block unauthorised requests and allow only those with valid JWT tokens.
- Cloudflare's logs are used to monitor incoming traffic and confirm the setup is working as expected.

### Dynamic behaviour

- The traffic generator refreshes the JWT token every 100 iterations to simulate real-world token expiration.
- Random delays between requests mimic realistic traffic patterns.

---

## Steps to generate the JWT Validation rule in Cloudflare

### 1. Generate a JWT public/private key pair

- Use [mkjwk.org](https://mkjwk.org) to create keys with the **RS256** algorithm.
- Save all keys — X.509 PEM-format public and private self-signed keys, plus the JWK in JSON format — and add them to the Visual Studio workspace. These will be used to generate new tokens so the traffic generator can issue compliant requests against the JWT Validation rule.

### 2. Upload the public key to Cloudflare

- Navigate to the **Cloudflare Dashboard → API Gateway → JWT Settings**.
- Add the JSON Web public key with `kid = your-key-id`.

### 3. Configure the WAF rule

- Go to **Cloudflare Dashboard → Security → WAF**.
- Add a rule to allow requests with valid JWTs.
- Block all endpoints with a fallthrough rule.

### 4. Generate traffic with the Python script

```
python3 traffic_generator.py
```

### 5. Test the setup

- Observe Cloudflare logs to verify successful JWT validation.

---

## Verification

Run a curl command with a valid JWT:

```
curl -X GET "https://petstore.api.vefnetworks.com/api/v3/store/inventory" -H "jwt: <valid-jwt>"
```

Check Cloudflare's API Gateway logs to confirm the request was validated successfully.

---

## Troubleshooting

**Problem:** Requests are blocked even with a valid JWT.
**Solution:** Verify that the `kid` in the token matches the uploaded key in Cloudflare.

**Problem:** SSL errors with WARP enabled.
**Solution:** Add WARP's root certificate to your system or Python trust store.

---

## Conclusion

By following this guide, your API is secured with JWT validation, ensuring only authorised users can access your endpoints.

---

## Comments captured at time of copy

- **Sébastien Onillon, 2025-11-18:** "Hi Emmanuel Francis — this guide includes a reference to an internal link: *How to setup your own API Shield DEMO from Start to Finish!* so it can't be shared externally. If that's ok, I will duplicate it and remove this link to make a shareable version for customers."

---

*Two people liked this page on the wiki. No labels attached.*
