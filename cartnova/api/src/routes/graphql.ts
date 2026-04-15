// CartNova GraphQL Endpoint
//
// A single POST /api/v2/graphql endpoint that accepts varied query bodies.
// This is a mock — it parses the query name and returns plausible data.
// Important for API Shield because GraphQL is a single endpoint with
// many operations, which tests discovery's ability to handle it.

import { Hono } from "hono";
import { jwtAuth } from "../middleware/jwt";
import { products, categories, orders } from "../data/seed";

const graphql = new Hono();

// Public introspection (no auth)
graphql.get("/", (c) => {
  return c.json({
    message: "CartNova GraphQL API",
    endpoint: "POST /api/v2/graphql",
    docs: "https://docs.cartnova.example.com/graphql",
    playground: "/api/v2/graphql/playground",
  });
});

// GraphQL playground page (public)
graphql.get("/playground", (c) => {
  return c.json({
    name: "CartNova GraphQL Playground",
    version: "2.0",
    schema_url: "/api/v2/graphql/schema",
  });
});

// Schema introspection (public)
graphql.get("/schema", (c) => {
  return c.json({
    data: {
      __schema: {
        queryType: { name: "Query" },
        mutationType: { name: "Mutation" },
        types: [
          { name: "Product", fields: ["id", "name", "price", "rating", "variants", "reviews"] },
          { name: "Category", fields: ["id", "name", "products"] },
          { name: "Cart", fields: ["items", "subtotal", "item_count"] },
          { name: "Order", fields: ["id", "status", "items", "total", "tracking"] },
          { name: "User", fields: ["id", "email", "name", "orders", "addresses"] },
          { name: "Checkout", fields: ["id", "status", "shipping", "payment"] },
        ],
      },
    },
  });
});

// Main GraphQL endpoint (POST with query body)
graphql.post("/", jwtAuth, async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ errors: [{ message: "Invalid JSON body" }] }, 400);
  }

  const query = body?.query || "";
  const variables = body?.variables || {};
  const operationName = body?.operationName || extractOperationName(query);

  // Route to mock resolvers based on operation
  const result = resolveQuery(operationName, query, variables);
  return c.json(result);
});

function extractOperationName(query: string): string {
  const match = query.match(/(?:query|mutation)\s+(\w+)/);
  return match?.[1] || "unknown";
}

function resolveQuery(
  operationName: string,
  query: string,
  variables: Record<string, any>
): { data?: any; errors?: any[] } {
  const op = operationName.toLowerCase();
  const q = query.toLowerCase();

  // Product queries
  if (op.includes("product") || q.includes("product")) {
    if (q.includes("products") || op.includes("list") || op.includes("all")) {
      return {
        data: {
          products: {
            edges: products.slice(0, 6).map((p: any) => ({
              node: { id: p.id, name: p.name, price: p.price, rating: p.rating, inStock: p.in_stock },
              cursor: btoa(p.id),
            })),
            pageInfo: { hasNextPage: true, endCursor: "cHJvZF95Z2EwMDE=" },
            totalCount: products.length,
          },
        },
      };
    }
    const pid = variables?.id || "prod_tv4k01";
    const product = (products as any[]).find((p: any) => p.id === pid) || products[0];
    return {
      data: {
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          currency: product.currency,
          rating: product.rating,
          reviewCount: product.review_count,
          inStock: product.in_stock,
          description: product.description,
        },
      },
    };
  }

  // Category queries
  if (op.includes("categor") || q.includes("categor")) {
    return {
      data: {
        categories: (categories as any[]).map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          productCount: (products as any[]).filter((p: any) => p.category_id === cat.id).length,
        })),
      },
    };
  }

  // Order queries
  if (op.includes("order") || q.includes("order")) {
    return {
      data: {
        orders: {
          edges: (orders as any[]).map((o: any) => ({
            node: { id: o.id, status: o.status, total: o.total, itemCount: o.item_count },
          })),
          totalCount: orders.length,
        },
      },
    };
  }

  // User/me query
  if (op.includes("user") || op.includes("me") || q.includes("viewer") || q.includes("me {")) {
    return {
      data: {
        viewer: {
          id: "user_a8k2m1nz",
          email: "emma.johnson@example.com",
          name: "Emma Johnson",
          orderCount: 2,
        },
      },
    };
  }

  // Cart query
  if (op.includes("cart") || q.includes("cart")) {
    return {
      data: {
        cart: {
          items: [],
          subtotal: 0,
          itemCount: 0,
          currency: "EUR",
        },
      },
    };
  }

  // Search query
  if (op.includes("search") || q.includes("search")) {
    const term = variables?.query || variables?.q || "laptop";
    const searchResults = (products as any[])
      .filter((p: any) => p.name.toLowerCase().includes(term.toLowerCase()))
      .slice(0, 5);
    return {
      data: {
        search: {
          results: searchResults.map((p: any) => ({ id: p.id, name: p.name, price: p.price })),
          totalCount: searchResults.length,
          query: term,
        },
      },
    };
  }

  // Mutations
  if (q.includes("mutation")) {
    if (q.includes("addtocart") || q.includes("add_to_cart")) {
      return {
        data: {
          addToCart: {
            cart: { itemCount: 1, subtotal: 29.99 },
            addedItem: { productId: variables?.productId || "prod_tv4k01", quantity: 1 },
          },
        },
      };
    }
    if (q.includes("createreview") || q.includes("review")) {
      return {
        data: {
          createReview: {
            review: { id: `rev_${Date.now().toString(36)}`, rating: variables?.rating || 5 },
          },
        },
      };
    }
    return {
      data: { [operationName]: { success: true } },
    };
  }

  // Unknown operation
  return {
    errors: [{ message: `Unknown operation: ${operationName}`, extensions: { code: "UNKNOWN_OPERATION" } }],
  };
}

export default graphql;
