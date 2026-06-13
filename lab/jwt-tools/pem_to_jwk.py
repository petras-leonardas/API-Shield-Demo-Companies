#!/usr/bin/env python3
"""
Convert public_key.pem -> public_key.jwk and public_key.jwks.

Run after generating the RSA keypair with openssl. Idempotent -- re-runs overwrite
the .jwk / .jwks outputs but never touches the .pem files.

The JWK is what Cloudflare's API Shield JWT Configuration accepts when you upload
a verification key. Some endpoints accept a single JWK; others want a JWKS (a wrapper
of the form {"keys": [<jwk>]}). We emit both so whichever Cloudflare flow is in front
of you will have the right format.
"""
import base64
import json
import pathlib
import sys
from cryptography.hazmat.primitives import serialization

KID = "petstore-rs256"  # must match the kid the signer puts in JWT headers


def int_to_b64url(i: int) -> str:
    """Encode an integer to unpadded base64url per RFC 7518 section 2."""
    raw = i.to_bytes((i.bit_length() + 7) // 8, "big")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def main() -> int:
    here = pathlib.Path(__file__).parent
    pem_path = here / "public_key.pem"
    if not pem_path.exists():
        print(f"error: {pem_path} not found -- run openssl genrsa first", file=sys.stderr)
        return 1

    pub = serialization.load_pem_public_key(pem_path.read_bytes())
    numbers = pub.public_numbers()

    jwk = {
        "kty": "RSA",
        "alg": "RS256",
        "use": "sig",
        "kid": KID,
        "n": int_to_b64url(numbers.n),
        "e": int_to_b64url(numbers.e),
    }

    (here / "public_key.jwk").write_text(json.dumps(jwk, indent=2) + "\n")
    (here / "public_key.jwks").write_text(json.dumps({"keys": [jwk]}, indent=2) + "\n")

    print(f"  kid: {jwk['kid']}")
    print(f"  alg: {jwk['alg']}")
    print(f"  wrote: public_key.jwk")
    print(f"  wrote: public_key.jwks")
    return 0


if __name__ == "__main__":
    sys.exit(main())
