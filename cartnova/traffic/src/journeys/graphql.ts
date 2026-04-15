// GraphQL Traffic Journey
// Simulates frontend and mobile app GraphQL queries against
// POST /api/v2/graphql with varied operations and variables.

import { USERS, PRODUCT_IDS } from "../config";
import { api, humanDelay, burstDelay, pick, setClientProfile } from "../http";

export async function graphqlJourney(): Promise<void> {
  // Login first (GraphQL requires JWT)
  setClientProfile("browser");
  const user = pick(USERS);
  const login = await api<{ access_token: string }>("POST", "/api/v2/auth/login", {
    body: { email: user.email, password: user.password },
  });
  if (!login?.access_token) return;
  const token = login.access_token;

  // Introspection (public)
  await api("GET", "/api/v2/graphql");
  await humanDelay();
  await api("GET", "/api/v2/graphql/schema");
  await humanDelay();

  // Product list query
  await api("POST", "/api/v2/graphql", {
    token,
    body: {
      query: `query ListProducts($first: Int) {
        products(first: $first) {
          edges { node { id name price rating inStock } cursor }
          pageInfo { hasNextPage endCursor }
          totalCount
        }
      }`,
      variables: { first: 12 },
      operationName: "ListProducts",
    },
  });
  await humanDelay();

  // Single product query
  const productId = pick(PRODUCT_IDS);
  await api("POST", "/api/v2/graphql", {
    token,
    body: {
      query: `query GetProduct($id: ID!) {
        product(id: $id) {
          id name price currency rating reviewCount inStock description
        }
      }`,
      variables: { id: productId },
      operationName: "GetProduct",
    },
  });
  await humanDelay();

  // Categories query
  await api("POST", "/api/v2/graphql", {
    token,
    body: {
      query: `query GetCategories {
        categories { id name productCount }
      }`,
      operationName: "GetCategories",
    },
  });
  await humanDelay();

  // Viewer (current user) query
  await api("POST", "/api/v2/graphql", {
    token,
    body: {
      query: `query Me {
        viewer { id email name orderCount }
      }`,
      operationName: "Me",
    },
  });
  await humanDelay();

  // Orders query
  await api("POST", "/api/v2/graphql", {
    token,
    body: {
      query: `query MyOrders($first: Int) {
        orders(first: $first) {
          edges { node { id status total itemCount } }
          totalCount
        }
      }`,
      variables: { first: 10 },
      operationName: "MyOrders",
    },
  });
  await humanDelay();

  // Cart query
  await api("POST", "/api/v2/graphql", {
    token,
    body: {
      query: `query GetCart {
        cart { items { productId name quantity price } subtotal itemCount currency }
      }`,
      operationName: "GetCart",
    },
  });
  await humanDelay();

  // Search query
  await api("POST", "/api/v2/graphql", {
    token,
    body: {
      query: `query SearchProducts($query: String!) {
        search(query: $query) { results { id name price } totalCount query }
      }`,
      variables: { query: pick(["laptop", "headphones", "jacket", "coffee"]) },
      operationName: "SearchProducts",
    },
  });
  await humanDelay();

  // Mutation: add to cart
  await api("POST", "/api/v2/graphql", {
    token,
    body: {
      query: `mutation AddToCart($productId: ID!, $quantity: Int) {
        addToCart(productId: $productId, quantity: $quantity) {
          cart { itemCount subtotal }
          addedItem { productId quantity }
        }
      }`,
      variables: { productId: pick(PRODUCT_IDS), quantity: 1 },
      operationName: "AddToCart",
    },
  });
  await humanDelay();

  // Mutation: create review
  await api("POST", "/api/v2/graphql", {
    token,
    body: {
      query: `mutation CreateReview($productId: ID!, $rating: Int!, $text: String) {
        createReview(productId: $productId, rating: $rating, text: $text) {
          review { id rating }
        }
      }`,
      variables: { productId: pick(PRODUCT_IDS), rating: 4, text: "Great product" },
      operationName: "CreateReview",
    },
  });
}

/** Mobile app GraphQL — shorter queries, fewer fields (bandwidth optimization) */
export async function mobileGraphqlJourney(): Promise<void> {
  setClientProfile("mobile");
  const user = pick(USERS);
  const login = await api<{ access_token: string }>("POST", "/api/v2/auth/login", {
    body: { email: user.email, password: user.password },
  });
  if (!login?.access_token) return;
  const token = login.access_token;

  // Mobile home screen: products + categories in one query
  await api("POST", "/api/v2/graphql", {
    token,
    body: {
      query: `query HomeScreen { products(first: 8) { edges { node { id name price } } } categories { id name } }`,
      operationName: "HomeScreen",
    },
  });
  await burstDelay();

  // Product detail
  await api("POST", "/api/v2/graphql", {
    token,
    body: {
      query: `query ProductDetail($id: ID!) { product(id: $id) { id name price inStock } }`,
      variables: { id: pick(PRODUCT_IDS) },
      operationName: "ProductDetail",
    },
  });
  await burstDelay();

  // Cart + user in one query
  await api("POST", "/api/v2/graphql", {
    token,
    body: {
      query: `query AppState { viewer { id name } cart { itemCount subtotal } }`,
      operationName: "AppState",
    },
  });
}
