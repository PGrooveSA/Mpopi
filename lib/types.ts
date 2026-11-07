export const ALL_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"] as const;
export type Size = (typeof ALL_SIZES)[number];

export interface ProductColor {
  id: string;
  name: string;
  hex: string;
  /** Front print artwork (transparent PNG/WebP) */
  print: string;
  /** Optional back print artwork */
  printBack?: string;
  /** Real photos of this colour (optional) */
  photos: string[];
}

export interface Variant {
  colorId: string;
  size: Size;
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  collection: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  sizes: Size[];
  colors: ProductColor[];
  variants: Variant[];
  /** Print width relative to the chest (0.4 – 1.2) */
  printScale: number;
  /** Vertical print offset in mockup units (-60 – 120) */
  printOffsetY: number;
  backPrintScale: number;
  featured: boolean;
  isNew: boolean;
  status: "active" | "hidden";
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  image: string;
  accent: string;
}

export interface OrderItem {
  productId: string;
  slug: string;
  name: string;
  colorId: string;
  colorName: string;
  size: Size;
  qty: number;
  price: number;
}

export const ORDER_STATUSES = ["new", "awaiting_payment", "paid", "shipped", "completed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Order {
  id: string;
  ref: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    note?: string;
  };
  delivery: { id: string; name: string; price: number };
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  adminNote?: string;
}

export interface DeliveryOption {
  id: string;
  name: string;
  description: string;
  price: number;
  requiresAddress: boolean;
}

export interface SizeChartRow {
  size: Size;
  chest: number;
  length: number;
  sleeve: number;
}

export interface Settings {
  storeName: string;
  whatsappNumber: string;
  contactEmail: string;
  announcement: string;
  hideSoldOut: boolean;
  freeDeliveryOver: number;
  hero: { eyebrow: string; title: string; subtitle: string; image: string };
  about: { title: string; body: string; image: string };
  deliveryOptions: DeliveryOption[];
  sizeChart: SizeChartRow[];
  faqs: { q: string; a: string }[];
  socials: { instagram: string; tiktok: string; facebook: string };
  lookbook: { src: string; caption: string }[];
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  /** Bumped to invalidate all existing sessions (password change, sign out everywhere). */
  tokenVersion?: number;
}

export interface DB {
  version: number;
  orderSeq: number;
  settings: Settings;
  collections: Collection[];
  products: Product[];
  orders: Order[];
  admins: AdminUser[];
}

/** Product shape sent to the browser */
export type PublicProduct = Omit<Product, "createdAt" | "updatedAt">;
