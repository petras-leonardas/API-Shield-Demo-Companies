// CartNova Data Types
// ID formats follow the convention from api-architecture.md

export interface User {
  id: string; // user_{8chars}
  email: string;
  name: string;
  phone: string;
  role: "buyer" | "admin";
  password_hash: string; // not returned in responses
  created_at: string;
}

export interface Address {
  id: string; // addr_{6chars}
  user_id: string;
  type: "shipping" | "billing";
  name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string;
}

export interface Category {
  id: string; // cat_{4chars}
  name: string;
  slug: string;
  description: string;
  parent_id: string | null;
}

export interface Product {
  id: string; // prod_{6chars}
  name: string;
  description: string;
  price: number;
  currency: string;
  category_id: string;
  seller_id: string;
  images: string[];
  rating: number;
  review_count: number;
  in_stock: boolean;
  created_at: string;
}

export interface Variant {
  id: string; // var_{descriptor}
  product_id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  author_name: string;
  rating: number;
  text: string;
  created_at: string;
}

export interface CartItem {
  id: string; // ci_{8chars}
  product_id: string;
  variant_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
  currency: string;
}

export interface Cart {
  user_id: string;
  items: CartItem[];
  subtotal: number;
  currency: string;
  item_count: number;
}

export interface Checkout {
  id: string; // chk_{8chars}
  user_id: string;
  items: CartItem[];
  subtotal: number;
  currency: string;
  shipping: ShippingInfo | null;
  payment: PaymentInfo | null;
  status: "started" | "shipping_set" | "payment_set" | "confirmed";
  created_at: string;
}

export interface ShippingInfo {
  name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string;
}

export interface PaymentInfo {
  payment_method: string;
  card_token: string;
  last_four: string;
  billing_address: {
    name: string;
    address_line_1: string;
    city: string;
    postal_code: string;
    country: string;
  };
}

export interface Order {
  id: string; // ord_{6chars}
  user_id: string;
  items: OrderItem[];
  shipping: {
    name: string;
    address: string;
    phone: string;
  };
  payment: {
    method: string;
    last_four: string;
    amount: number;
    currency: string;
  };
  status: "processing" | "shipped" | "delivered" | "returned";
  tracking: TrackingInfo | null;
  created_at: string;
}

export interface OrderItem {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface TrackingInfo {
  carrier: string;
  tracking_number: string;
  status: string;
  updates: { timestamp: string; location: string; status: string }[];
}

export interface Seller {
  id: string; // sel_{6chars}
  name: string;
  api_key: string;
  email: string;
  product_ids: string[];
}

export interface SellerAnalytics {
  seller_id: string;
  period: string;
  revenue: number;
  order_count: number;
  top_products: { product_id: string; name: string; units_sold: number }[];
}

// JWT payload structure matching api-architecture.md
export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: string;
  iat: number;
  exp: number;
  iss: string; // "cartnova-auth"
}
