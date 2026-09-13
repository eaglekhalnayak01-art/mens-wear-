/** Shapes shared by repositories, services and the UI (server + client safe). */

export type ImageRef = { src: string; alt: string };

export type ColorRef = { name: string; hex: string };

export type ProductCard = {
  id: number;
  name: string;
  slug: string;
  brand: string | null;
  price: number;
  compareAtPrice: number | null;
  discountPct: number;
  image: ImageRef;
  /** Second frame, cross-faded on hover on desktop. */
  hoverImage?: ImageRef | null;
  category: { name: string; slug: string } | null;
  subCategory: string | null;
  sizes: string[];
  colors: ColorRef[];
  stock: number;
  inStock: boolean;
  isNewArrival: boolean;
  isBestseller: boolean;
  isFeatured: boolean;
  /** Per-style payment rules, decided by the owner in the product form. */
  paymentMode: "both" | "cod" | "online";
  /** Dispatch promise for this style; null falls back to the shop-wide window. */
  deliveryDays: number | null;
  rating: number | null;
  ratingCount: number;
  badge?: string | null;
  /** First in-stock size+colour, so the grid can add to cart without a PDP visit. */
  quickAdd?: { variantId: number; size: string | null; color: string | null } | null;
};

export type ProductVariant = {
  id: number;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  sku: string | null;
  stock: number;
  price: number;
};

export type ProductDetail = ProductCard & {
  description: string | null;
  fabric: string | null;
  care: string | null;
  sku: string | null;
  gallery: ImageRef[];
  variants: ProductVariant[];
  lowStockThreshold: number;
  soldQty: number;
  status: "published" | "hidden" | "draft";
  createdAt: string;
  updatedAt: string;
  categoryId: number | null;
};

export type AdminProductRow = ProductDetail & {
  stockBySize: { size: string | null; color: string | null; stock: number; variantId: number; sku: string | null }[];
  outOfStockCount: number;
  updatedAtLabel?: string;
};

export type Facets = {
  sizes: { label: string; count: number }[];
  colors: { name: string; hex: string | null; count: number }[];
  categories: { name: string; slug: string; count: number }[];
  price: { min: number; max: number };
  onSale: number;
  inStock: number;
};

export type CartLineInput = { variantId: number; qty: number };

export type QuotedLine = {
  productId: number;
  variantId: number;
  name: string;
  slug: string;
  size: string | null;
  color: string | null;
  unitPrice: number;
  compareAtPrice: number | null;
  qty: number;
  lineTotal: number;
  image: ImageRef;
  sku: string | null;
  availableStock: number;
  maxQtyReached: boolean;
  paymentMode: "both" | "cod" | "online";
};

export type Quote = {
  lines: QuotedLine[];
  subtotal: number;
  mrpTotal: number;
  discount: number;
  shipping: number;
  codFee: number;
  total: number;
  itemCount: number;
  freeShippingGap: number;
  minOrderShortfall: number;
  notices: string[];
  /** False when something in the cart refuses that method — checkout dims it. */
  allowsCod: boolean;
  allowsOnline: boolean;
};

export type OrderSummary = {
  id: number;
  publicRef: string;
  placedAt: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  itemCount: number;
  customerName: string;
  customerMobile: string;
  /** Present on admin/account lists too — the table shows the money split inline. */
  subtotal?: number;
  discount?: number;
  shipping?: number;
  city?: string;
  pin?: string;
  expectedDeliveryAt?: string | null;
};

export type OrderEvent = {
  status: string;
  note: string | null;
  actorType: string;
  createdAt: string;
};

export type OrderDetail = OrderSummary & {
  email: string | null;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pin: string;
    landmark: string | null;
  };
  subtotal: number;
  discount: number;
  shipping: number;
  codFee: number;
  notes: string | null;
  cancelledReason: string | null;
  /** UPI reference the customer typed when they paid to the shop's QR. */
  paymentReference: string | null;
  expectedDeliveryAt: string | null;
  deliveredAt: string | null;
  items: {
    name: string;
    size: string | null;
    color: string | null;
    unitPrice: number;
    qty: number;
    lineTotal: number;
    image: string | null;
    slug: string | null;
    sku: string | null;
  }[];
  events: OrderEvent[];
  customerId: number | null;
};
