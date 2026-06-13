#!/usr/bin/env python3
"""
Mint a fresh RS256 JWT signed by the local private key.

Adapted from Emmanuel's wiki-02 (which uses ES256). We use RS256 because
mkjwk-style RSA keypairs are the more common starting point for new customers
and the Cloudflare JWT Configuration UI defaults to RS256.

Usage:
    source .venv/bin/activate
    python3 generate_jwt.py        # prints token to stdout

The token's kid header MUST match the kid in public_key.jwk so Cloudflare
picks the right verification key.

Claims:
  iss   "https://petstore.carnova.uk"  -- issuer; cosmetic, helps trace tokens
  aud   "petstore"                     -- audience; must match if you scope rules to it
  sub   "user123"                      -- subject; this is the JWT claim used as
                                          the API Shield Session Identifier
  exp   now + 1 hour
  iat   now
"""
import pathlib
import sys
import time

from authlib.jose import jwt

KID = "petstore-rs256"  # must match public_key.jwk
ALG = "RS256"
ISSUER = "https://petstore.carnova.uk"
AUDIENCE = "petstore"
SUBJECT = "user123"
TTL_SECONDS = 3600


def main() -> int:
    here = pathlib.Path(__file__).parent
    private_key_path = here / "private_key.pem"
    if not private_key_path.exists():
        print(f"error: {private_key_path} not found", file=sys.stderr)
        return 1

    header = {"alg": ALG, "kid": KID, "typ": "JWT"}
    now = int(time.time())
    payload = {
        "iss": ISSUER,
        "aud": AUDIENCE,
        "sub": SUBJECT,
        "iat": now,
        "exp": now + TTL_SECONDS,
    }

    token_bytes = jwt.encode(header, payload, private_key_path.read_bytes())
    print(token_bytes.decode("utf-8"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
