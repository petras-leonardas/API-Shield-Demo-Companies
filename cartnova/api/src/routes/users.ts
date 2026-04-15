// CartNova User/Auth Routes -- 6 endpoints
// Mixed auth: register/login are public, everything else requires JWT
// Responses contain PII (email, phone, addresses) for Sensitive Data Detection

import { Hono } from "hono";
import { sign } from "hono/jwt";
import {
  users,
  findUserByEmail,
  findUserById,
  getAddressesForUser,
  JWT_SECRET,
  JWT_ISSUER,
} from "../data/seed";
import { jwtAuth } from "../middleware/jwt";

const app = new Hono();

// POST /api/v2/auth/register -- Create account (public)
app.post("/auth/register", async (c) => {
  const body = await c.req.json();

  if (!body.email || !body.password || !body.name) {
    return c.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "email, password, and name are required",
        },
      },
      400
    );
  }

  if (findUserByEmail(body.email)) {
    return c.json(
      {
        error: {
          code: "CONFLICT",
          message: "An account with this email already exists",
        },
      },
      409
    );
  }

  const userId = `user_${Date.now().toString(36).slice(-8)}`;
  const now = Math.floor(Date.now() / 1000);

  const token = await sign(
    {
      sub: userId,
      email: body.email,
      role: "buyer",
      iat: now,
      exp: now + 900, // 15 minutes
      iss: JWT_ISSUER,
    },
    JWT_SECRET
  );

  return c.json(
    {
      user: {
        id: userId,
        email: body.email,
        name: body.name,
        created_at: new Date().toISOString(),
      },
      access_token: token,
      token_type: "Bearer",
      expires_in: 900,
    },
    201
  );
});

// POST /api/v2/auth/login -- Login (public)
app.post("/auth/login", async (c) => {
  const body = await c.req.json();

  if (!body.email || !body.password) {
    return c.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "email and password are required",
        },
      },
      400
    );
  }

  const user = findUserByEmail(body.email);

  if (!user) {
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        },
      },
      401
    );
  }

  // Mock API: any password works for known users
  const now = Math.floor(Date.now() / 1000);

  const accessToken = await sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: now,
      exp: now + 900, // 15 minutes
      iss: JWT_ISSUER,
    },
    JWT_SECRET
  );

  const refreshToken = await sign(
    {
      sub: user.id,
      type: "refresh",
      iat: now,
      exp: now + 604800, // 7 days
      iss: JWT_ISSUER,
    },
    JWT_SECRET
  );

  // Set refresh token as HTTP-only cookie
  c.header(
    "Set-Cookie",
    `refresh_token=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/api/v2/auth/refresh; Max-Age=604800`
  );

  return c.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 900,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
});

// POST /api/v2/auth/refresh -- Refresh access token
app.post("/auth/refresh", async (c) => {
  // In a real app, we'd validate the refresh token from the cookie
  // For the mock, we just issue a new token for the first user
  const cookie = c.req.header("Cookie");

  if (!cookie || !cookie.includes("refresh_token=")) {
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Missing refresh token cookie",
        },
      },
      401
    );
  }

  // Mock: return a fresh token for user_a8k2m1nz
  const now = Math.floor(Date.now() / 1000);
  const user = users[0];

  const accessToken = await sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: now,
      exp: now + 900,
      iss: JWT_ISSUER,
    },
    JWT_SECRET
  );

  return c.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 900,
  });
});

// GET /api/v2/users/me -- Get current user profile (JWT required)
// Returns PII: email, phone, full name
app.get("/users/me", jwtAuth, (c) => {
  const userId = c.get("userId");
  const user = findUserById(userId);

  if (!user) {
    return c.json(
      {
        error: { code: "NOT_FOUND", message: "User not found" },
      },
      404
    );
  }

  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    created_at: user.created_at,
  });
});

// PUT /api/v2/users/me -- Update profile (JWT required)
app.put("/users/me", jwtAuth, async (c) => {
  const userId = c.get("userId");
  const user = findUserById(userId);

  if (!user) {
    return c.json(
      {
        error: { code: "NOT_FOUND", message: "User not found" },
      },
      404
    );
  }

  const body = await c.req.json();

  // Mock: return updated user with any provided fields
  return c.json({
    id: user.id,
    email: body.email || user.email,
    name: body.name || user.name,
    phone: body.phone || user.phone,
    created_at: user.created_at,
    updated_at: new Date().toISOString(),
  });
});

// GET /api/v2/users/me/addresses -- Get saved addresses (JWT required)
// Returns PII: full addresses, phone numbers
app.get("/users/me/addresses", jwtAuth, (c) => {
  const userId = c.get("userId");
  const userAddresses = getAddressesForUser(userId);

  return c.json({
    addresses: userAddresses,
    total: userAddresses.length,
  });
});

export default app;
