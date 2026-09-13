/**
 * Store settings: a typed view over the `settings` key/value table.
 *
 * Every field has a default here, so a fresh install (or a partially filled
 * dashboard) always renders a complete website — and the owner can rename the
 * shop, change delivery charges or rewrite the return policy without a deploy.
 */
import { all, get, nowIso, run } from "@/server/db";

export type Settings = {
  // Identity
  shopName: string;
  tagline: string;
  logoText: string;
  logoImage: string;
  brandStory: string;
  aboutTitle: string;
  foundedYear: string;
  // Contact
  phone: string;
  whatsapp: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pin: string;
  mapUrl: string;
  hours: string;
  instagram: string;
  facebook: string;
  youtube: string;
  whatsappEnabled: boolean;
  whatsappGreeting: string;
  // Merchandising copy
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  offerTitle: string;
  offerText: string;
  offerImage: string;
  announcement: string;
  announcementEnabled: boolean;
  footerNote: string;
  // Delivery & payments
  deliveryFee: number;
  freeDeliveryOver: number;
  minOrderValue: number;
  codFee: number;
  codEnabled: boolean;
  onlineEnabled: boolean;
  /** How “pay online” actually works today: a UPI QR the owner uploads, or a gateway. */
  onlineMode: "qr" | "gateway" | "off";
  upiId: string;
  upiPayeeName: string;
  upiQrImage: string;
  paymentInstructions: string;
  /** Ask for the UPI reference number so a transfer can be matched to an order. */
  utrRequired: boolean;
  /** Owner-side alerts: a number to notify, an inbox address, an optional webhook. */
  notifyMobile: string;
  notifyEmail: string;
  notifyWebhookUrl: string;
  notifyOrderEnabled: boolean;
  dispatchDays: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  returnWindowDays: number;
  gstNumber: string;
  gstState: string;
  // Policies
  shippingPolicy: string;
  returnPolicy: string;
  privacyPolicy: string;
  terms: string;
};

export const DEFAULT_SETTINGS: Settings = {
  shopName: "Mens Wear",
  tagline: "Considered menswear, tailored for everyday",
  logoText: "M",
  logoImage: "",
  brandStory:
    "Mens Wear began in 2014 as a two-shelf shop on Station Road with one idea: a man should be able to buy a shirt he can wear to a wedding on Saturday and to the office on Monday. We still buy fabric ourselves, still check every stitch before it is folded, and still remember what you bought last season.",
  aboutTitle: "A shop that knows its cloth",
  foundedYear: "2014",
  phone: "+91 98250 41188",
  whatsapp: "9825041188",
  email: "care@menswear.in",
  addressLine1: "12 Station Road, Rajwadi Corner",
  addressLine2: "Near City Bus Stand",
  city: "Surat",
  state: "Gujarat",
  pin: "395002",
  mapUrl: "https://maps.google.com/?q=Station+Road+Surat",
  hours: "Mon – Sat, 10:30 am – 9:00 pm · Sunday, 11:00 am – 2:00 pm",
  instagram: "https://instagram.com/menswear",
  facebook: "",
  youtube: "",
  whatsappEnabled: true,
  whatsappGreeting:
    "Hello Mens Wear, I would like some help choosing a size.",
  heroEyebrow: "Autumn / Winter 2026",
  heroTitle: "Cloth that earns\nits place in the wardrobe",
  heroSubtitle:
    "Hand-finished suiting, honest cotton and everyday denim — cut, checked and folded in-house since 2014.",
  heroImage: "/images/hero-editorial.jpg",
  offerTitle: "Flat 25% off winter knits",
  offerText: "Sweaters, hoodies and sweatshirts reduced while the lot lasts.",
  offerImage: "/images/banner-sale.jpg",
  announcement: "Free delivery across India on orders above ₹1,999 · Cash on delivery and UPI accepted",
  announcementEnabled: true,
  footerNote: "Prices include GST. Free size exchange within 7 days in store.",
  deliveryFee: 79,
  freeDeliveryOver: 1999,
  minOrderValue: 499,
  codFee: 0,
  codEnabled: true,
  onlineEnabled: true,
  onlineMode: "qr",
  upiId: "menswear@okhdfcbank",
  upiPayeeName: "Mens Wear",
  upiQrImage: "",
  paymentInstructions:
    "Pay the exact amount to the UPI ID or scan the QR, then type the 12-digit reference number from your UPI app. We confirm the order as soon as the money is visible — usually within minutes.",
  utrRequired: false,
  notifyMobile: "9825041188",
  notifyEmail: "care@menswear.in",
  notifyWebhookUrl: "",
  notifyOrderEnabled: true,
  dispatchDays: 2,
  deliveryDaysMin: 3,
  deliveryDaysMax: 6,
  returnWindowDays: 7,
  gstNumber: "24ABCDE1234F1Z5",
  gstState: "Gujarat",
  shippingPolicy:
    "Orders are quality-checked and iron-folded within {dispatchDays} working day(s) of confirmation.\n\nDelivery across India usually takes {deliveryDaysMin}–{deliveryDaysMax} working days from dispatch. Metro pin codes are typically one day faster.\n\nShipping is a flat ₹{deliveryFee}, and free on orders above ₹{freeDeliveryOver}. A soft copy of your bill travels with the parcel.\n\nYou will receive a WhatsApp message with the courier details as soon as your order leaves the shop.",
  returnPolicy:
    "Unworn items with the original tag and packaging can be returned or exchanged within {returnWindowDays} days of delivery.\n\nInnerwear, socks and sale underwear are not eligible for return for hygiene reasons. Ethnic wear with zari or hand-work can be exchanged for size only.\n\nTo start a return, message us on WhatsApp or call the shop with your order number. We arrange a pickup, and refunds land in the original payment method within 5–7 working days after the parcel reaches us. Cash-on-delivery refunds are paid to your UPI or bank account.\n\nWrong size? We swap it once, free — that has always been the deal at this shop.",
  privacyPolicy:
    "We collect only what we need to make and deliver your order: your name, mobile number, delivery address and, optionally, an email address.\n\nYour mobile number is used for order updates and the one-time password that signs you in. We never sell customer data, and we do not send marketing SMS without your consent.\n\nPayment details are never stored on our servers — card and UPI payments are handled by our payment gateway, which is PCI-DSS compliant.\n\nYou can ask us to delete your account and its data any time by calling or emailing the shop.",
  terms:
    "By placing an order you agree to buy the items listed at the price shown at checkout, inclusive of GST where applicable.\n\nOrder confirmation is your receipt; prices are valid at the time of order and are not adjusted for later price changes or sales.\n\nWe take care to show fabric colours accurately, but screen calibration varies — a slight difference in shade is normal in natural fibres like linen and khadi.\n\nSize guidance on each product page is measured in inches on the garment, not on the body. When between sizes, we suggest the larger one for a relaxed fit.\n\nThese terms are governed by the laws of India, and disputes fall under the jurisdiction of {city}.",
};

type Row = { key: string; value: string | null; type: string };

function decode(value: string | null, type: string): unknown {
  if (value === null) return undefined;
  switch (type) {
    case "number":
      return Number(value);
    case "boolean":
      return value === "1" || value === "true";
    case "json":
      try {
        return JSON.parse(value);
      } catch {
        return undefined;
      }
    default:
      return value;
  }
}

function encode(value: unknown): { value: string; type: string } {
  if (typeof value === "number") return { value: String(value), type: "number" };
  if (typeof value === "boolean") return { value: value ? "1" : "0", type: "boolean" };
  if (value === null || value === undefined) return { value: "", type: "string" };
  if (typeof value === "object") return { value: JSON.stringify(value), type: "json" };
  return { value: String(value), type: "string" };
}

/** Merged defaults + stored rows. Cheap enough to call from any component. */
export function readSettings(): Settings {
  const rows = all<Row>(`SELECT key, value, type FROM settings`);
  const stored: Record<string, unknown> = {};
  for (const row of rows) {
    const value = decode(row.value, row.type);
    if (value !== undefined) stored[row.key] = value;
  }
  return { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) };
}

export function writeSettings(patch: Partial<Settings>) {
  for (const [key, raw] of Object.entries(patch)) {
    const { value, type } = encode(raw);
    const existing = get<{ key: string }>(`SELECT key FROM settings WHERE key = ?`, key);
    if (existing) {
      run(`UPDATE settings SET value = ?, type = ?, updated_at = ? WHERE key = ?`, value, type, nowIso(), key);
    } else {
      run(
        `INSERT INTO settings (key, value, type, updated_at) VALUES (?,?,?,?)`,
        key,
        value,
        type,
        nowIso(),
      );
    }
  }
}

/** Fills {placeholders} from settings so policy text stays in sync with the shop. */
export function interpolatePolicy(text: string, settings: Settings) {
  return text.replace(/\{(\w+)\}/g, (_m, key: keyof Settings) => {
    const value = settings[key];
    if (typeof value === "number") return value.toLocaleString("en-IN");
    if (typeof value === "string") return value;
    return _m;
  });
}

export function fullAddress(s: Settings) {
  return [s.addressLine1, s.addressLine2, `${s.city} ${s.pin}`.trim(), s.state].filter(Boolean).join(", ");
}

export function waNumber(s: Settings) {
  return s.whatsapp.replace(/\D/g, "");
}

export function whatsappHref(s: Settings, message?: string) {
  const number = waNumber(s);
  if (!s.whatsappEnabled || number.length < 10) return null;
  const text = encodeURIComponent(message ?? s.whatsappGreeting);
  return `https://wa.me/91${number.slice(-10)}?text=${text}`;
}
