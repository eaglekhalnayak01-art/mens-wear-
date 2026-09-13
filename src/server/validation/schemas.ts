/**
 * Server-side validation. Client forms validate too, but only for UX — every
 * request is re-parsed here and every field is length-clamped, because this is
 * the boundary the database sees.
 */
import { z } from "zod";
import { ORDER_STATUSES } from "@/lib/order-status";
import { normalizeMobile } from "@/lib/format";

const trimmed = (max: number) => z.string().trim().max(max);

export const mobileSchema = z
  .string()
  .transform((v) => normalizeMobile(v))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"));

export const pinSchema = z
  .string()
  .trim()
  .pipe(z.string().regex(/^\d{6}$/, "PIN code must be 6 digits"));

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.string().email("Enter a valid email address").max(160, "Email is too long"));

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "Passwords are capped at 128 characters")
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "Mix letters and numbers");

// ---------------------------------------------------------------- customer auth
export const otpRequestSchema = z.object({
  mobile: mobileSchema,
  purpose: z.enum(["login", "register", "reset"]).default("login"),
});

export const otpVerifySchema = z.object({
  mobile: mobileSchema,
  code: trimmed(10).pipe(z.string().regex(/^\d{6}$/, "Enter the 6-digit code")),
  // Only used on first sign-in — one screen, no separate registration form.
  name: trimmed(80).optional(),
  email: emailSchema.optional().or(z.literal("")),
});

export const profileUpdateSchema = z.object({
  name: trimmed(80).min(2, "Please tell us your name"),
  email: emailSchema.optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
});

export const addressSchema = z.object({
  label: trimmed(24).optional(),
  recipient: trimmed(80).min(2, "Recipient name is required"),
  phone: mobileSchema,
  line1: trimmed(160).min(6, "House / flat and street are required"),
  line2: trimmed(160).optional(),
  city: trimmed(60).min(2, "City is required"),
  state: trimmed(60).min(2, "State is required"),
  pin: pinSchema,
  landmark: trimmed(120).optional(),
  isDefault: z.coerce.boolean().optional(),
});

// ---------------------------------------------------------------- checkout
export const cartLineSchema = z.object({
  variantId: z.number().int().positive(),
  qty: z.number().int().min(1).max(10),
});

export const checkoutSchema = z.object({
  customer: z.object({
    name: trimmed(80).min(2, "Full name is required"),
    mobile: mobileSchema,
    email: emailSchema.optional().or(z.literal("")).transform((v) => (v === "" ? undefined : v)),
  }),
  shipping: addressSchema.omit({ label: true, isDefault: true }),
  paymentMethod: z.enum(["cod", "online"]).default("cod"),
  notes: trimmed(400).optional(),
  // Client prices are ignored; this is only a diff-check for the "cart changed" notice.
  items: z.array(cartLineSchema).min(1, "Your cart is empty").max(40),
  saveAddress: z.coerce.boolean().optional(),
});

export const trackSchema = z.object({
  ref: trimmed(40).optional(),
  mobile: z.string().trim().optional().transform((v) => (v ? normalizeMobile(v) : v)),
});

export const contactSchema = z.object({
  name: trimmed(80).min(2, "Please add your name"),
  mobile: mobileSchema,
  email: emailSchema.optional().or(z.literal("")),
  topic: z.enum(["product", "size", "order", "bulk", "other"]).default("other"),
  message: trimmed(1200).min(10, "Tell us a little more (10+ characters)"),
});

// ---------------------------------------------------------------- admin auth
export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.string().email("Enter the owner email")),
  password: trimmed(128).min(1, "Enter your password"),
  // Simple bot gate — filled in by real users never seeing the field.
  website: z.string().max(0).optional(),
});

// ---------------------------------------------------------------- admin catalogue
export const adminProductSchema = z.object({
  name: trimmed(160).min(3, "Product name is required"),
  slug: trimmed(180).optional(),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  subCategory: trimmed(60).optional(),
  brand: trimmed(60).optional(),
  description: trimmed(4000).optional(),
  fabric: trimmed(300).optional(),
  care: trimmed(600).optional(),
  price: z.coerce.number().min(1, "Selling price must be at least ₹1").max(1_000_000),
  compareAtPrice: z.coerce
    .number()
    .min(0)
    .max(10_000_000)
    .nullable()
    .optional()
    .transform((v) => (v && v > 0 ? v : null)),
  sku: trimmed(40).optional(),
  status: z.enum(["published", "hidden", "draft"]).default("published"),
  isFeatured: z.coerce.boolean().default(false),
  isNewArrival: z.coerce.boolean().default(false),
  isBestseller: z.coerce.boolean().default(false),
  lowStockThreshold: z.coerce.number().int().min(0).max(999).default(6),
  sizes: z.array(trimmed(12).min(1)).max(30).default([]),
  colors: z
    .array(z.object({ name: trimmed(24).min(1), hex: trimmed(9).regex(/^#[0-9a-fA-F]{6}$/, "Use #rrggbb") }))
    .max(12)
    .default([]),
  // stock grid: one entry per size × colour that the owner actually sells
  variants: z
    .array(
      z.object({
        size: trimmed(12),
        color: trimmed(24),
        stock: z.coerce.number().int().min(0).max(99999).default(0),
      }),
    )
    .max(240)
    .default([]),
  images: z
    .array(z.object({ src: trimmed(400).min(1), alt: trimmed(160).optional(), isPrimary: z.coerce.boolean().optional() }))
    .max(16)
    .default([]),
});

export const adminProductPatchSchema = adminProductSchema.partial().extend({
  id: z.coerce.number().int().positive().optional(),
});

export const inlineEditSchema = z.object({
  price: z.coerce.number().min(1).max(1_000_000).optional(),
  compareAtPrice: z.coerce.number().min(0).max(10_000_000).nullable().optional(),
  status: z.enum(["published", "hidden", "draft"]).optional(),
  isFeatured: z.coerce.boolean().optional(),
  isNewArrival: z.coerce.boolean().optional(),
  isBestseller: z.coerce.boolean().optional(),
  lowStockThreshold: z.coerce.number().int().min(0).max(999).optional(),
});

export const variantStockSchema = z.object({
  variantId: z.number().int().positive(),
  stock: z.number().int().min(0).max(99999),
  reason: z.enum(["restock", "adjustment"]).default("adjustment"),
});

export const bulkStockSchema = z.object({
  productId: z.number().int().positive(),
  delta: z.number().int().min(-9999).max(9999),
  note: trimmed(160).optional(),
});

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES as unknown as [string, ...string[]]),
  note: trimmed(300).optional(),
  reason: trimmed(200).optional(),
});

export const orderFilterSchema = z.object({
  q: trimmed(80).optional(),
  status: z.enum([...ORDER_STATUSES, "all", "open"] as unknown as [string, ...string[]]).default("all"),
  payment: z.enum(["all", "cod", "online", "pending", "paid"] as unknown as [string, ...string[]]).default("all"),
  from: trimmed(20).optional(),
  to: trimmed(20).optional(),
  sort: z.enum(["newest", "oldest", "value_high", "value_low"]).default("newest"),
  page: z.coerce.number().int().min(1).max(200).default(1),
  perPage: z.coerce.number().int().min(5).max(100).default(20),
});

// ---------------------------------------------------------------- storefront queries
export const shopQuerySchema = z.object({
  q: trimmed(120).optional(),
  category: trimmed(80).optional(),
  collection: z.enum(["new", "bestsellers", "sale", "featured"]).optional(),
  sizes: trimmed(200).optional(), // comma separated labels
  colors: trimmed(200).optional(), // comma separated names
  min: z.coerce.number().min(0).max(1_000_000).optional(),
  max: z.coerce.number().min(0).max(10_000_000).optional(),
  sort: z.enum(["newest", "popular", "price_low", "price_high", "discount"]).default("newest"),
  availability: z.enum(["all", "in_stock", "low"]).default("all"),
  page: z.coerce.number().int().min(1).max(200).default(1),
  perPage: z.coerce.number().int().min(6).max(48).default(12),
});

export type ShopQuery = z.infer<typeof shopQuerySchema>;

export const settingsSchema = z.object({
  shopName: trimmed(80).min(2),
  tagline: trimmed(160).optional(),
  logoText: trimmed(24).optional(),
  logoImage: trimmed(400).optional(),
  brandStory: z.string().max(4000).optional(),
  aboutTitle: trimmed(120).optional(),
  foundedYear: trimmed(6).optional(),
  hours: trimmed(160).optional(),
  whatsappGreeting: trimmed(400).optional(),
  heroEyebrow: trimmed(60).optional(),
  heroTitle: trimmed(160).optional(),
  heroSubtitle: trimmed(400).optional(),
  heroImage: trimmed(400).optional(),
  offerTitle: trimmed(120).optional(),
  offerText: trimmed(400).optional(),
  offerImage: trimmed(400).optional(),
  phone: trimmed(20).optional(),
  whatsapp: trimmed(20).optional(),
  email: trimmed(160).optional(),
  addressLine1: trimmed(200).optional(),
  addressLine2: trimmed(200).optional(),
  city: trimmed(60).optional(),
  state: trimmed(60).optional(),
  pin: trimmed(10).optional(),
  mapUrl: trimmed(400).optional(),
  instagram: trimmed(300).optional(),
  facebook: trimmed(300).optional(),
  youtube: trimmed(300).optional(),
  whatsappEnabled: z.coerce.boolean().default(true),
  deliveryFee: z.coerce.number().min(0).max(9999),
  freeDeliveryOver: z.coerce.number().min(0).max(999999),
  minOrderValue: z.coerce.number().min(0).max(999999),
  codFee: z.coerce.number().min(0).max(999).default(0),
  codEnabled: z.coerce.boolean().default(true),
  onlineEnabled: z.coerce.boolean().default(false),
  dispatchDays: z.coerce.number().int().min(1).max(30).default(2),
  deliveryDaysMin: z.coerce.number().int().min(1).max(60).default(3),
  deliveryDaysMax: z.coerce.number().int().min(1).max(90).default(6),
  returnWindowDays: z.coerce.number().int().min(0).max(120).default(7),
  shippingPolicy: z.string().max(6000).optional(),
  returnPolicy: z.string().max(6000).optional(),
  privacyPolicy: z.string().max(6000).optional(),
  terms: z.string().max(6000).optional(),
  announcement: trimmed(200).optional(),
  announcementEnabled: z.coerce.boolean().default(true),
  gstNumber: trimmed(24).optional(),
  gstState: trimmed(60).optional(),
  footerNote: trimmed(300).optional(),
});

// ---------------------------------------------------------------- admin queries
export const adminProductListQuery = z.object({
  q: trimmed(80).optional(),
  status: z.enum(["all", "published", "hidden", "draft"]).default("all"),
  categoryId: z.coerce.number().int().positive().optional(),
  flag: z.enum(["all", "new", "bestseller", "featured", "sale"]).default("all"),
  stock: z.enum(["all", "low", "out", "in"]).default("all"),
  sort: z.enum(["newest", "oldest", "name_az", "stock_low", "price_high", "price_low"]).default("newest"),
  page: z.coerce.number().int().min(1).max(500).default(1),
  perPage: z.coerce.number().int().min(5).max(100).default(20),
});

export const adminImageListSchema = z.object({
  images: z
    .array(z.object({ src: trimmed(400).min(1), alt: trimmed(160).optional(), isPrimary: z.coerce.boolean().optional() }))
    .min(0)
    .max(16),
});

export const enquiryStatusSchema = z.object({
  status: z.enum(["new", "replied", "closed"]),
});
