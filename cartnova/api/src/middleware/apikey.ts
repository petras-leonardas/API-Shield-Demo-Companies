// CartNova API Key Authentication Middleware
// Validates X-Seller-Key header against known seller API keys

import { createMiddleware } from "hono/factory";
import { findSellerByApiKey } from "../data/seed";

declare module "hono" {
  interface ContextVariableMap {
    sellerId: string;
    sellerName: string;
  }
}

export const apiKeyAuth = createMiddleware(async (c, next) => {
  const apiKey = c.req.header("X-Seller-Key");

  if (!apiKey) {
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Missing X-Seller-Key header",
        },
      },
      401
    );
  }

  const seller = findSellerByApiKey(apiKey);

  if (!seller) {
    return c.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "Invalid API key",
        },
      },
      403
    );
  }

  c.set("sellerId", seller.id);
  c.set("sellerName", seller.name);

  await next();
});
