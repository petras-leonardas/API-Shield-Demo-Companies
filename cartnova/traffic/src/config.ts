// CartNova Traffic Generator -- Configuration
// All seed data constants needed to drive realistic traffic

// ── Traffic Kill Switch ─────────────────────────────────────────────
// Set to false to pause ALL automated traffic generation.
// Set back to true and redeploy to resume.
// Why: Free Workers plan has 100K requests/day limit on the personal account.
export const TRAFFIC_ENABLED = false;

export const BASE_URL = "https://carnova.uk";

// ── Users (any password works on the mock API) ──────────────────────
export const USERS = [
  { email: "emma.johnson@example.com", password: "Str0ng!Pass42", userId: "user_a8k2m1nz" },
  { email: "lucas.chen@example.com", password: "Secure#Chen88", userId: "user_p3x7q9wt" },
  { email: "sofia.martinez@example.com", password: "M4drid!2024", userId: "user_r5j4h6yb" },
];

// ── Seller API Keys ─────────────────────────────────────────────────
export const SELLERS = [
  { name: "TechVault", apiKey: "sk_tv_live_a1b2c3d4e5f6", productIds: ["prod_tv4k01", "prod_hp2401", "prod_ear001", "prod_bk0001"] },
  { name: "NordicWear", apiKey: "sk_nw_live_g7h8i9j0k1l2", productIds: ["prod_jkt001", "prod_snk001", "prod_tsh001"] },
  { name: "HomeEssence", apiKey: "sk_he_live_m3n4o5p6q7r8", productIds: ["prod_cfm001", "prod_knf001", "prod_lmp001", "prod_yga001", "prod_bkp001"] },
];

// ── Product IDs ─────────────────────────────────────────────────────
export const PRODUCT_IDS = [
  "prod_tv4k01", "prod_hp2401", "prod_ear001",
  "prod_jkt001", "prod_snk001", "prod_tsh001",
  "prod_cfm001", "prod_knf001", "prod_lmp001",
  "prod_yga001", "prod_bkp001", "prod_bk0001",
];

// ── Category IDs ────────────────────────────────────────────────────
export const CATEGORY_IDS = [
  "cat_elec", "cat_clth", "cat_home", "cat_sprt", "cat_book",
];

// ── Order IDs (for lookup/tracking journeys) ────────────────────────
// Mapped to users who own them for realistic access patterns
export const USER_ORDERS: Record<string, string[]> = {
  "user_a8k2m1nz": ["ord_em0001", "ord_em0002"],
  "user_p3x7q9wt": ["ord_lc0001"],
  "user_r5j4h6yb": ["ord_sm0001"],
};

// ── Checkout IDs (for status lookup) ────────────────────────────────
export const CHECKOUT_IDS = ["chk_ej0001", "chk_lc0001"];

// ── Search Terms (realistic e-commerce searches) ────────────────────
export const SEARCH_TERMS = [
  "laptop", "headphones", "jacket", "coffee", "knife",
  "yoga", "sneakers", "tv", "bottle", "shirt",
  "wireless", "kitchen", "outdoor", "running", "smart",
  "gift", "premium", "sale", "new arrivals", "bestseller",
];

// ── Shipping Addresses (for checkout) ───────────────────────────────
export const SHIPPING_ADDRESSES = [
  {
    name: "Emma Johnson",
    address_line_1: "Keizersgracht 442",
    address_line_2: "Apt 3B",
    city: "Amsterdam",
    postal_code: "1016 GD",
    country: "NL",
    phone: "+31-20-555-0142",
  },
  {
    name: "Lucas Chen",
    address_line_1: "Friedrichstrasse 89",
    address_line_2: "4. OG",
    city: "Berlin",
    postal_code: "10117",
    country: "DE",
    phone: "+49-30-555-0198",
  },
  {
    name: "Sofia Martinez",
    address_line_1: "Carrer de Mallorca 275",
    city: "Barcelona",
    postal_code: "08008",
    country: "ES",
    phone: "+34-91-555-0276",
  },
];

// ── Payment Methods ─────────────────────────────────────────────────
export const PAYMENT_METHODS = [
  { payment_method: "card", card_token: "tok_visa_4242" },
  { payment_method: "card", card_token: "tok_mc_8888" },
  { payment_method: "card", card_token: "tok_amex_1234" },
  { payment_method: "ideal", card_token: "tok_ideal_nl_001" },
];

// ── New Product Templates (for seller create) ───────────────────────
export const NEW_PRODUCT_TEMPLATES = [
  { name: "Wireless Charging Pad", price: 29.99, category_id: "cat_elec" },
  { name: "Bamboo Cutting Board Set", price: 39.99, category_id: "cat_home" },
  { name: "Merino Wool Beanie", price: 24.99, category_id: "cat_clth" },
  { name: "Resistance Band Set", price: 19.99, category_id: "cat_sprt" },
  { name: "LED Reading Light", price: 14.99, category_id: "cat_home" },
  { name: "Running Vest", price: 44.99, category_id: "cat_sprt" },
  { name: "USB-C Hub 7-in-1", price: 49.99, category_id: "cat_elec" },
  { name: "Ceramic Travel Mug", price: 22.99, category_id: "cat_home" },
];
