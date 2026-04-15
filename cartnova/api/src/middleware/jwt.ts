// CartNova JWT Authentication Middleware
// Uses Hono's built-in JWT support (Web Crypto API under the hood)

import { createMiddleware } from "hono/factory";
import { jwt, verify } from "hono/jwt";
import { JWT_SECRET, JWT_ISSUER } from "../data/seed";

// Type augmentation for Hono context
declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    userEmail: string;
    userRole: string;
  }
}

// JWT middleware that validates the token and extracts user info
// Rejects: missing token, expired, wrong issuer, invalid signature
export const jwtAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Missing or invalid Authorization header. Expected: Bearer <token>",
        },
      },
      401
    );
  }

  const token = authHeader.substring(7);

  try {
    const payload = await verify(token, JWT_SECRET, "HS256");

    // Validate issuer
    if (payload.iss !== JWT_ISSUER) {
      return c.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: `Invalid token issuer. Expected: ${JWT_ISSUER}`,
          },
        },
        401
      );
    }

    // Set user info on context for route handlers
    c.set("userId", payload.sub as string);
    c.set("userEmail", (payload.email as string) || "");
    c.set("userRole", (payload.role as string) || "buyer");

    await next();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Invalid or expired token";

    // Differentiate error types for testing JWT validation rules
    if (message.includes("exp")) {
      return c.json(
        {
          error: {
            code: "TOKEN_EXPIRED",
            message: "JWT token has expired. Please refresh your token.",
          },
        },
        401
      );
    }

    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: `JWT validation failed: ${message}`,
        },
      },
      401
    );
  }
});
