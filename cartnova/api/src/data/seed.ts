// CartNova Seed Data
// All data is fake but realistic -- designed to trigger Cloudflare Sensitive Data Detection
// Uses European names/addresses/phones matching CartNova's Amsterdam HQ context

import type {
  User,
  Address,
  Category,
  Product,
  Variant,
  Review,
  Cart,
  CartItem,
  Checkout,
  Order,
  Seller,
  SellerAnalytics,
} from "./types";

// ─── JWT Configuration ──────────────────────────────────────────────
// Shared secret between the API and the traffic generator
export const JWT_SECRET = "cartnova-jwt-secret-2024";
export const JWT_ISSUER = "cartnova-auth";

// ─── Users ──────────────────────────────────────────────────────────
// 3 users with distinct data for BOLA testing (Vulnerability Scanner)

export const users: User[] = [
  {
    id: "user_a8k2m1nz",
    email: "emma.johnson@example.com",
    name: "Emma Johnson",
    phone: "+31-20-555-0142",
    role: "buyer",
    password_hash: "$2b$12$fakehashemma",
    created_at: "2024-03-15T10:30:00Z",
  },
  {
    id: "user_p3x7q9wt",
    email: "lucas.chen@example.com",
    name: "Lucas Chen",
    phone: "+49-30-555-0198",
    role: "buyer",
    password_hash: "$2b$12$fakehashlucas",
    created_at: "2024-05-22T08:15:00Z",
  },
  {
    id: "user_r5j4h6yb",
    email: "sofia.martinez@example.com",
    name: "Sofia Martinez",
    phone: "+34-91-555-0276",
    role: "buyer",
    password_hash: "$2b$12$fakehashsofia",
    created_at: "2024-07-10T14:45:00Z",
  },
];

// ─── Addresses ──────────────────────────────────────────────────────

export const addresses: Address[] = [
  {
    id: "addr_em0001",
    user_id: "user_a8k2m1nz",
    type: "shipping",
    name: "Emma Johnson",
    address_line_1: "Keizersgracht 442",
    address_line_2: "Apt 3B",
    city: "Amsterdam",
    postal_code: "1016 GD",
    country: "NL",
    phone: "+31-20-555-0142",
  },
  {
    id: "addr_em0002",
    user_id: "user_a8k2m1nz",
    type: "billing",
    name: "Emma Johnson",
    address_line_1: "Keizersgracht 442",
    city: "Amsterdam",
    postal_code: "1016 GD",
    country: "NL",
    phone: "+31-20-555-0142",
  },
  {
    id: "addr_lc0001",
    user_id: "user_p3x7q9wt",
    type: "shipping",
    name: "Lucas Chen",
    address_line_1: "Friedrichstraße 89",
    address_line_2: "4. OG",
    city: "Berlin",
    postal_code: "10117",
    country: "DE",
    phone: "+49-30-555-0198",
  },
  {
    id: "addr_sm0001",
    user_id: "user_r5j4h6yb",
    type: "shipping",
    name: "Sofia Martinez",
    address_line_1: "Carrer de Mallorca 275",
    city: "Barcelona",
    postal_code: "08008",
    country: "ES",
    phone: "+34-91-555-0276",
  },
];

// ─── Categories ─────────────────────────────────────────────────────

export const categories: Category[] = [
  {
    id: "cat_elec",
    name: "Electronics",
    slug: "electronics",
    description: "Smartphones, laptops, audio, and more",
    parent_id: null,
  },
  {
    id: "cat_clth",
    name: "Clothing & Fashion",
    slug: "clothing-fashion",
    description: "Apparel, shoes, and accessories",
    parent_id: null,
  },
  {
    id: "cat_home",
    name: "Home & Kitchen",
    slug: "home-kitchen",
    description: "Everything for your home",
    parent_id: null,
  },
  {
    id: "cat_sprt",
    name: "Sports & Outdoors",
    slug: "sports-outdoors",
    description: "Fitness, camping, and outdoor gear",
    parent_id: null,
  },
  {
    id: "cat_book",
    name: "Books & Media",
    slug: "books-media",
    description: "Books, ebooks, and digital media",
    parent_id: null,
  },
];

// ─── Products ───────────────────────────────────────────────────────
// 12 products across 5 categories, 3 sellers

export const products: Product[] = [
  {
    id: "prod_tv4k01",
    name: "ProVision 4K Smart TV 55\"",
    description:
      "Crystal-clear 4K UHD display with HDR10+ and Dolby Atmos. Built-in streaming apps. 120Hz refresh rate for gaming.",
    price: 799.99,
    currency: "EUR",
    category_id: "cat_elec",
    seller_id: "sel_tv0001",
    images: [
      "https://cdn.cartnova.example.com/products/tv4k01_front.jpg",
      "https://cdn.cartnova.example.com/products/tv4k01_side.jpg",
    ],
    rating: 4.6,
    review_count: 234,
    in_stock: true,
    created_at: "2024-01-15T09:00:00Z",
  },
  {
    id: "prod_hp2401",
    name: 'NovaBook Pro Laptop 14"',
    description:
      "Lightweight ultrabook with M3 chip, 16GB RAM, 512GB SSD. All-day battery life. Perfect for professionals.",
    price: 1249.0,
    currency: "EUR",
    category_id: "cat_elec",
    seller_id: "sel_tv0001",
    images: [
      "https://cdn.cartnova.example.com/products/hp2401_open.jpg",
      "https://cdn.cartnova.example.com/products/hp2401_closed.jpg",
    ],
    rating: 4.8,
    review_count: 156,
    in_stock: true,
    created_at: "2024-02-20T11:00:00Z",
  },
  {
    id: "prod_ear001",
    name: "AirWave Pro Earbuds",
    description:
      "Active noise cancellation, 30-hour battery, IPX5 water resistance. Premium sound with spatial audio.",
    price: 149.99,
    currency: "EUR",
    category_id: "cat_elec",
    seller_id: "sel_tv0001",
    images: [
      "https://cdn.cartnova.example.com/products/ear001_case.jpg",
      "https://cdn.cartnova.example.com/products/ear001_buds.jpg",
    ],
    rating: 4.4,
    review_count: 412,
    in_stock: true,
    created_at: "2024-03-10T08:00:00Z",
  },
  {
    id: "prod_jkt001",
    name: "Nordic Storm Jacket",
    description:
      "Waterproof, windproof, breathable. 3-layer GORE-TEX construction. Designed for Scandinavian winters.",
    price: 189.0,
    currency: "EUR",
    category_id: "cat_clth",
    seller_id: "sel_nw0002",
    images: [
      "https://cdn.cartnova.example.com/products/jkt001_front.jpg",
      "https://cdn.cartnova.example.com/products/jkt001_back.jpg",
    ],
    rating: 4.7,
    review_count: 89,
    in_stock: true,
    created_at: "2024-04-05T10:00:00Z",
  },
  {
    id: "prod_snk001",
    name: "UrbanGlide Sneakers",
    description:
      "Lightweight running shoes with responsive cushioning. Knit upper for breathability. Available in 6 colors.",
    price: 119.99,
    currency: "EUR",
    category_id: "cat_clth",
    seller_id: "sel_nw0002",
    images: [
      "https://cdn.cartnova.example.com/products/snk001_side.jpg",
      "https://cdn.cartnova.example.com/products/snk001_top.jpg",
    ],
    rating: 4.3,
    review_count: 567,
    in_stock: true,
    created_at: "2024-05-15T12:00:00Z",
  },
  {
    id: "prod_tsh001",
    name: "Merino Wool T-Shirt",
    description:
      "100% merino wool. Naturally odor-resistant, temperature regulating. Machine washable.",
    price: 49.99,
    currency: "EUR",
    category_id: "cat_clth",
    seller_id: "sel_nw0002",
    images: [
      "https://cdn.cartnova.example.com/products/tsh001_front.jpg",
    ],
    rating: 4.5,
    review_count: 203,
    in_stock: true,
    created_at: "2024-06-01T09:30:00Z",
  },
  {
    id: "prod_cfm001",
    name: "AeroPress Coffee Maker",
    description:
      "Compact, portable coffee maker. Makes espresso-style coffee in under a minute. BPA-free.",
    price: 34.99,
    currency: "EUR",
    category_id: "cat_home",
    seller_id: "sel_he0003",
    images: [
      "https://cdn.cartnova.example.com/products/cfm001_kit.jpg",
    ],
    rating: 4.9,
    review_count: 1024,
    in_stock: true,
    created_at: "2024-01-20T14:00:00Z",
  },
  {
    id: "prod_knf001",
    name: "Damascus Steel Chef Knife 8\"",
    description:
      "67-layer Damascus steel. Ergonomic pakkawood handle. Razor-sharp out of the box.",
    price: 79.99,
    currency: "EUR",
    category_id: "cat_home",
    seller_id: "sel_he0003",
    images: [
      "https://cdn.cartnova.example.com/products/knf001_blade.jpg",
      "https://cdn.cartnova.example.com/products/knf001_handle.jpg",
    ],
    rating: 4.7,
    review_count: 321,
    in_stock: true,
    created_at: "2024-02-10T16:00:00Z",
  },
  {
    id: "prod_lmp001",
    name: "Smart LED Desk Lamp",
    description:
      "Adjustable color temperature (2700K-6500K). Touch controls. USB-C charging port. Memory function.",
    price: 59.99,
    currency: "EUR",
    category_id: "cat_home",
    seller_id: "sel_he0003",
    images: [
      "https://cdn.cartnova.example.com/products/lmp001_warm.jpg",
      "https://cdn.cartnova.example.com/products/lmp001_cool.jpg",
    ],
    rating: 4.2,
    review_count: 178,
    in_stock: true,
    created_at: "2024-03-25T11:00:00Z",
  },
  {
    id: "prod_yga001",
    name: "ProFlex Yoga Mat",
    description:
      "6mm thick TPE material. Non-slip surface. Eco-friendly. Includes carrying strap.",
    price: 29.99,
    currency: "EUR",
    category_id: "cat_sprt",
    seller_id: "sel_he0003",
    images: [
      "https://cdn.cartnova.example.com/products/yga001_rolled.jpg",
    ],
    rating: 4.4,
    review_count: 445,
    in_stock: true,
    created_at: "2024-04-15T10:00:00Z",
  },
  {
    id: "prod_bkp001",
    name: "Titanium Water Bottle 750ml",
    description:
      "Double-wall vacuum insulation. Keeps drinks cold 24h, hot 12h. Leak-proof lid.",
    price: 24.99,
    currency: "EUR",
    category_id: "cat_sprt",
    seller_id: "sel_he0003",
    images: [
      "https://cdn.cartnova.example.com/products/bkp001_silver.jpg",
    ],
    rating: 4.6,
    review_count: 289,
    in_stock: true,
    created_at: "2024-05-20T08:00:00Z",
  },
  {
    id: "prod_bk0001",
    name: "Clean Code: A Handbook of Agile Software Craftsmanship",
    description:
      "By Robert C. Martin. The essential guide to writing readable, maintainable code. Paperback, 464 pages.",
    price: 39.99,
    currency: "EUR",
    category_id: "cat_book",
    seller_id: "sel_tv0001",
    images: [
      "https://cdn.cartnova.example.com/products/bk0001_cover.jpg",
    ],
    rating: 4.5,
    review_count: 892,
    in_stock: true,
    created_at: "2024-01-05T07:00:00Z",
  },
];

// ─── Variants ───────────────────────────────────────────────────────

export const variants: Variant[] = [
  // Nordic Storm Jacket variants
  {
    id: "var_jkt_s_blk",
    product_id: "prod_jkt001",
    name: "Small / Black",
    sku: "JKT-STORM-S-BLK",
    price: 189.0,
    stock: 23,
    attributes: { size: "S", color: "Black" },
  },
  {
    id: "var_jkt_m_blk",
    product_id: "prod_jkt001",
    name: "Medium / Black",
    sku: "JKT-STORM-M-BLK",
    price: 189.0,
    stock: 45,
    attributes: { size: "M", color: "Black" },
  },
  {
    id: "var_jkt_l_nav",
    product_id: "prod_jkt001",
    name: "Large / Navy",
    sku: "JKT-STORM-L-NAV",
    price: 189.0,
    stock: 31,
    attributes: { size: "L", color: "Navy" },
  },
  // UrbanGlide Sneakers variants
  {
    id: "var_snk_42_wht",
    product_id: "prod_snk001",
    name: "EU 42 / White",
    sku: "SNK-GLIDE-42-WHT",
    price: 119.99,
    stock: 56,
    attributes: { size: "EU 42", color: "White" },
  },
  {
    id: "var_snk_43_blk",
    product_id: "prod_snk001",
    name: "EU 43 / Black",
    sku: "SNK-GLIDE-43-BLK",
    price: 119.99,
    stock: 34,
    attributes: { size: "EU 43", color: "Black" },
  },
  {
    id: "var_snk_44_red",
    product_id: "prod_snk001",
    name: "EU 44 / Red",
    sku: "SNK-GLIDE-44-RED",
    price: 119.99,
    stock: 18,
    attributes: { size: "EU 44", color: "Red" },
  },
  // Merino T-Shirt variants
  {
    id: "var_tsh_m_gry",
    product_id: "prod_tsh001",
    name: "Medium / Grey",
    sku: "TSH-MERINO-M-GRY",
    price: 49.99,
    stock: 67,
    attributes: { size: "M", color: "Grey" },
  },
  {
    id: "var_tsh_l_blk",
    product_id: "prod_tsh001",
    name: "Large / Black",
    sku: "TSH-MERINO-L-BLK",
    price: 49.99,
    stock: 42,
    attributes: { size: "L", color: "Black" },
  },
];

// ─── Reviews ────────────────────────────────────────────────────────

export const reviews: Review[] = [
  {
    id: "rev_001",
    product_id: "prod_tv4k01",
    user_id: "user_a8k2m1nz",
    author_name: "Emma J.",
    rating: 5,
    text: "Incredible picture quality. The HDR is stunning, especially for nature documentaries. Setup was easy.",
    created_at: "2024-09-15T14:30:00Z",
  },
  {
    id: "rev_002",
    product_id: "prod_tv4k01",
    user_id: "user_p3x7q9wt",
    author_name: "Lucas C.",
    rating: 4,
    text: "Great TV for the price. Only downside is the built-in speakers could be better. Using a soundbar now.",
    created_at: "2024-10-02T18:00:00Z",
  },
  {
    id: "rev_003",
    product_id: "prod_cfm001",
    user_id: "user_r5j4h6yb",
    author_name: "Sofia M.",
    rating: 5,
    text: "Best coffee I've made at home. Compact enough for travel. I bring it to the office every day.",
    created_at: "2024-08-20T07:45:00Z",
  },
  {
    id: "rev_004",
    product_id: "prod_jkt001",
    user_id: "user_a8k2m1nz",
    author_name: "Emma J.",
    rating: 5,
    text: "Survived a week of Dutch rain without any leaks. Warm but not too heavy. True to size.",
    created_at: "2024-11-05T16:20:00Z",
  },
  {
    id: "rev_005",
    product_id: "prod_ear001",
    user_id: "user_p3x7q9wt",
    author_name: "Lucas C.",
    rating: 4,
    text: "Noise cancellation is excellent on the train. Battery easily lasts my commute for a week.",
    created_at: "2024-10-18T09:15:00Z",
  },
  {
    id: "rev_006",
    product_id: "prod_knf001",
    user_id: "user_r5j4h6yb",
    author_name: "Sofia M.",
    rating: 5,
    text: "Beautiful blade. Cuts through everything effortlessly. The handle feels great. Worth every cent.",
    created_at: "2024-09-28T20:00:00Z",
  },
  {
    id: "rev_007",
    product_id: "prod_bk0001",
    user_id: "user_a8k2m1nz",
    author_name: "Emma J.",
    rating: 4,
    text: "Essential reading for any developer. Some examples are dated but the principles are timeless.",
    created_at: "2024-06-12T11:30:00Z",
  },
];

// ─── Carts ──────────────────────────────────────────────────────────

export const carts: Map<string, Cart> = new Map([
  [
    "user_a8k2m1nz",
    {
      user_id: "user_a8k2m1nz",
      items: [
        {
          id: "ci_snk00001",
          product_id: "prod_snk001",
          variant_id: "var_snk_42_wht",
          product_name: "UrbanGlide Sneakers - EU 42 / White",
          quantity: 1,
          price: 119.99,
          currency: "EUR",
        },
        {
          id: "ci_bk000001",
          product_id: "prod_bk0001",
          variant_id: null,
          product_name:
            "Clean Code: A Handbook of Agile Software Craftsmanship",
          quantity: 1,
          price: 39.99,
          currency: "EUR",
        },
      ],
      subtotal: 159.98,
      currency: "EUR",
      item_count: 2,
    },
  ],
  [
    "user_p3x7q9wt",
    {
      user_id: "user_p3x7q9wt",
      items: [
        {
          id: "ci_tv4k0001",
          product_id: "prod_tv4k01",
          variant_id: null,
          product_name: 'ProVision 4K Smart TV 55"',
          quantity: 1,
          price: 799.99,
          currency: "EUR",
        },
      ],
      subtotal: 799.99,
      currency: "EUR",
      item_count: 1,
    },
  ],
]);

// ─── Checkouts ──────────────────────────────────────────────────────
// chk_em0001 is in progress (payment_set), chk_lc0001 is confirmed

export const checkouts: Checkout[] = [
  {
    id: "chk_em0001",
    user_id: "user_a8k2m1nz",
    items: [
      {
        id: "ci_lmp00001",
        product_id: "prod_lmp001",
        variant_id: null,
        product_name: "Smart LED Desk Lamp",
        quantity: 1,
        price: 59.99,
        currency: "EUR",
      },
    ],
    subtotal: 59.99,
    currency: "EUR",
    shipping: {
      name: "Emma Johnson",
      address_line_1: "Keizersgracht 442",
      address_line_2: "Apt 3B",
      city: "Amsterdam",
      postal_code: "1016 GD",
      country: "NL",
      phone: "+31-20-555-0142",
    },
    payment: {
      payment_method: "card",
      card_token: "tok_visa_4242",
      last_four: "4242",
      billing_address: {
        name: "Emma Johnson",
        address_line_1: "Keizersgracht 442",
        city: "Amsterdam",
        postal_code: "1016 GD",
        country: "NL",
      },
    },
    status: "payment_set",
    created_at: "2024-11-20T10:00:00Z",
  },
  {
    id: "chk_lc0001",
    user_id: "user_p3x7q9wt",
    items: [
      {
        id: "ci_tsh00001",
        product_id: "prod_tsh001",
        variant_id: "var_tsh_m_gry",
        product_name: "Merino Wool T-Shirt - Medium / Grey",
        quantity: 2,
        price: 49.99,
        currency: "EUR",
      },
    ],
    subtotal: 99.98,
    currency: "EUR",
    shipping: {
      name: "Lucas Chen",
      address_line_1: "Friedrichstraße 89",
      address_line_2: "4. OG",
      city: "Berlin",
      postal_code: "10117",
      country: "DE",
      phone: "+49-30-555-0198",
    },
    payment: {
      payment_method: "card",
      card_token: "tok_mc_8888",
      last_four: "8888",
      billing_address: {
        name: "Lucas Chen",
        address_line_1: "Friedrichstraße 89",
        city: "Berlin",
        postal_code: "10117",
        country: "DE",
      },
    },
    status: "confirmed",
    created_at: "2024-11-19T15:30:00Z",
  },
];

// ─── Orders ─────────────────────────────────────────────────────────
// 4 orders: 2 for Emma, 1 for Lucas, 1 for Sofia
// NOTE: Orders are intentionally NOT filtered by user_id in GET /orders/{id}
//       This is the BOLA vulnerability the Vulnerability Scanner should find

export const orders: Order[] = [
  {
    id: "ord_em0001",
    user_id: "user_a8k2m1nz",
    items: [
      {
        product_id: "prod_tv4k01",
        name: 'ProVision 4K Smart TV 55"',
        quantity: 1,
        price: 799.99,
      },
      {
        product_id: "prod_ear001",
        name: "AirWave Pro Earbuds",
        quantity: 1,
        price: 149.99,
      },
    ],
    shipping: {
      name: "Emma Johnson",
      address: "Keizersgracht 442, Apt 3B, Amsterdam 1016 GD, NL",
      phone: "+31-20-555-0142",
    },
    payment: {
      method: "card",
      last_four: "4242",
      amount: 949.98,
      currency: "EUR",
    },
    status: "shipped",
    tracking: {
      carrier: "PostNL",
      tracking_number: "3SPOST1234567890",
      status: "in_transit",
      updates: [
        {
          timestamp: "2024-11-18T09:00:00Z",
          location: "Amsterdam Sorting Center",
          status: "Package received",
        },
        {
          timestamp: "2024-11-18T14:30:00Z",
          location: "Amsterdam Distribution Hub",
          status: "In transit",
        },
        {
          timestamp: "2024-11-19T08:00:00Z",
          location: "Local Delivery Depot",
          status: "Out for delivery",
        },
      ],
    },
    created_at: "2024-11-17T14:00:00Z",
  },
  {
    id: "ord_em0002",
    user_id: "user_a8k2m1nz",
    items: [
      {
        product_id: "prod_jkt001",
        name: "Nordic Storm Jacket",
        quantity: 1,
        price: 189.0,
      },
    ],
    shipping: {
      name: "Emma Johnson",
      address: "Keizersgracht 442, Apt 3B, Amsterdam 1016 GD, NL",
      phone: "+31-20-555-0142",
    },
    payment: {
      method: "card",
      last_four: "4242",
      amount: 189.0,
      currency: "EUR",
    },
    status: "delivered",
    tracking: {
      carrier: "DHL",
      tracking_number: "JD014600006823456789",
      status: "delivered",
      updates: [
        {
          timestamp: "2024-10-25T10:00:00Z",
          location: "DHL Warehouse Frankfurt",
          status: "Shipment created",
        },
        {
          timestamp: "2024-10-26T06:00:00Z",
          location: "DHL Hub Cologne",
          status: "In transit",
        },
        {
          timestamp: "2024-10-27T11:30:00Z",
          location: "Amsterdam",
          status: "Delivered",
        },
      ],
    },
    created_at: "2024-10-24T16:30:00Z",
  },
  {
    id: "ord_lc0001",
    user_id: "user_p3x7q9wt",
    items: [
      {
        product_id: "prod_cfm001",
        name: "AeroPress Coffee Maker",
        quantity: 1,
        price: 34.99,
      },
      {
        product_id: "prod_knf001",
        name: 'Damascus Steel Chef Knife 8"',
        quantity: 1,
        price: 79.99,
      },
    ],
    shipping: {
      name: "Lucas Chen",
      address: "Friedrichstraße 89, 4. OG, Berlin 10117, DE",
      phone: "+49-30-555-0198",
    },
    payment: {
      method: "card",
      last_four: "8888",
      amount: 114.98,
      currency: "EUR",
    },
    status: "processing",
    tracking: null,
    created_at: "2024-11-20T09:15:00Z",
  },
  {
    id: "ord_sm0001",
    user_id: "user_r5j4h6yb",
    items: [
      {
        product_id: "prod_yga001",
        name: "ProFlex Yoga Mat",
        quantity: 1,
        price: 29.99,
      },
      {
        product_id: "prod_bkp001",
        name: "Titanium Water Bottle 750ml",
        quantity: 2,
        price: 24.99,
      },
    ],
    shipping: {
      name: "Sofia Martinez",
      address: "Carrer de Mallorca 275, Barcelona 08008, ES",
      phone: "+34-91-555-0276",
    },
    payment: {
      method: "card",
      last_four: "1234",
      amount: 79.97,
      currency: "EUR",
    },
    status: "delivered",
    tracking: {
      carrier: "SEUR",
      tracking_number: "SEUR9876543210",
      status: "delivered",
      updates: [
        {
          timestamp: "2024-11-10T08:00:00Z",
          location: "Madrid Sorting Center",
          status: "Package received",
        },
        {
          timestamp: "2024-11-11T12:00:00Z",
          location: "Barcelona Hub",
          status: "Out for delivery",
        },
        {
          timestamp: "2024-11-11T16:45:00Z",
          location: "Barcelona",
          status: "Delivered",
        },
      ],
    },
    created_at: "2024-11-09T10:00:00Z",
  },
];

// ─── Sellers ────────────────────────────────────────────────────────

export const sellers: Seller[] = [
  {
    id: "sel_tv0001",
    name: "TechVault",
    api_key: "sk_tv_live_a1b2c3d4e5f6",
    email: "api@techvault.example.com",
    product_ids: ["prod_tv4k01", "prod_hp2401", "prod_ear001", "prod_bk0001"],
  },
  {
    id: "sel_nw0002",
    name: "NordicWear",
    api_key: "sk_nw_live_g7h8i9j0k1l2",
    email: "partner@nordicwear.example.com",
    product_ids: ["prod_jkt001", "prod_snk001", "prod_tsh001"],
  },
  {
    id: "sel_he0003",
    name: "HomeEssence",
    api_key: "sk_he_live_m3n4o5p6q7r8",
    email: "sellers@homeessence.example.com",
    product_ids: [
      "prod_cfm001",
      "prod_knf001",
      "prod_lmp001",
      "prod_yga001",
      "prod_bkp001",
    ],
  },
];

export const sellerAnalytics: Map<string, SellerAnalytics> = new Map([
  [
    "sel_tv0001",
    {
      seller_id: "sel_tv0001",
      period: "2024-11",
      revenue: 14589.5,
      order_count: 47,
      top_products: [
        {
          product_id: "prod_tv4k01",
          name: 'ProVision 4K Smart TV 55"',
          units_sold: 12,
        },
        {
          product_id: "prod_ear001",
          name: "AirWave Pro Earbuds",
          units_sold: 23,
        },
        {
          product_id: "prod_hp2401",
          name: 'NovaBook Pro Laptop 14"',
          units_sold: 8,
        },
      ],
    },
  ],
  [
    "sel_nw0002",
    {
      seller_id: "sel_nw0002",
      period: "2024-11",
      revenue: 8234.0,
      order_count: 31,
      top_products: [
        {
          product_id: "prod_snk001",
          name: "UrbanGlide Sneakers",
          units_sold: 18,
        },
        {
          product_id: "prod_jkt001",
          name: "Nordic Storm Jacket",
          units_sold: 9,
        },
        {
          product_id: "prod_tsh001",
          name: "Merino Wool T-Shirt",
          units_sold: 15,
        },
      ],
    },
  ],
  [
    "sel_he0003",
    {
      seller_id: "sel_he0003",
      period: "2024-11",
      revenue: 5672.25,
      order_count: 62,
      top_products: [
        {
          product_id: "prod_cfm001",
          name: "AeroPress Coffee Maker",
          units_sold: 34,
        },
        {
          product_id: "prod_knf001",
          name: 'Damascus Steel Chef Knife 8"',
          units_sold: 15,
        },
        {
          product_id: "prod_bkp001",
          name: "Titanium Water Bottle 750ml",
          units_sold: 22,
        },
      ],
    },
  ],
]);

// ─── Lookup helpers ─────────────────────────────────────────────────

export function findUserByEmail(email: string): User | undefined {
  return users.find((u) => u.email === email);
}

export function findUserById(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

export function findSellerByApiKey(key: string): Seller | undefined {
  return sellers.find((s) => s.api_key === key);
}

export function getCartForUser(userId: string): Cart {
  return (
    carts.get(userId) || {
      user_id: userId,
      items: [],
      subtotal: 0,
      currency: "EUR",
      item_count: 0,
    }
  );
}

export function getOrdersForUser(userId: string): Order[] {
  return orders.filter((o) => o.user_id === userId);
}

export function getAddressesForUser(userId: string): Address[] {
  return addresses.filter((a) => a.user_id === userId);
}
