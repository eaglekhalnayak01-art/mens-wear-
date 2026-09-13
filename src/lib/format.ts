/**
 * Presentation helpers shared by the storefront and the dashboard.
 * Everything here is locale-correct for an Indian shop: ₹ with the lakh
 * grouping, DD MMM YYYY dates, and a single place to change it all.
 */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function money(value: number | null | undefined, { decimals = false } = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return decimals ? inrPaise.format(value) : inr.format(Math.round(value));
}

/** 1299 → "1,299" (used inside admin tables where the ₹ would repeat noisily). */
/** Explicit alias used by the storefront — money() is the admin/receipt spelling. */
export function formatPrice(value: number | null | undefined) {
  return money(value);
}

/** Compact price for filter chrome: ₹2k, ₹14.5k, ₹1.2L. */
export function formatShortPrice(value: number) {
  if (value >= 100000) return `₹${trimZero(value / 100000)}L`;
  if (value >= 1000) return `₹${trimZero(value / 1000)}k`;
  return `₹${Math.round(value)}`;
}

function trimZero(value: number) {
  const fixed = value.toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

export function amount(value: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(value));
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function discountPercent(price: number, compareAt?: number | null) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.max(0, Math.round(((compareAt - price) / compareAt) * 100));
}

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function formatDate(value: string | number | Date | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
}

export function formatDateTime(value: string | number | Date | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : dateTimeFmt.format(d);
}

export function formatDayMonth(value: string | Date) {
  const d = new Date(value);
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(d);
}

export function relativeTime(value: string | number | Date) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return formatDate(value);
}

/** "3–5 days" style delivery promise from a placed date. */
export function deliveryWindow(daysAhead = 4, span = 2) {
  const from = new Date();
  from.setDate(from.getDate() + daysAhead);
  const to = new Date(from);
  to.setDate(to.getDate() + span);
  return `${formatDate(from)} – ${formatDate(to)}`;
}

export function initials(name?: string | null, mobile?: string | null) {
  const source = (name ?? "").trim();
  if (source) {
    const parts = source.split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return mobile ? mobile.slice(-2) : "AM";
}

export function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function pluralize(count: number, one: string, many = `${one}s`) {
  return `${amount(count)} ${count === 1 ? one : many}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export function truncate(value: string, max = 120) {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

/** Digits only, Indian mobile rule: 10 digits starting 6-9. */
export function normalizeMobile(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits;
}

export function isValidMobile(raw: string) {
  const m = normalizeMobile(raw);
  return /^[6-9]\d{9}$/.test(m);
}

export function maskMobile(raw: string) {
  const m = normalizeMobile(raw);
  if (m.length !== 10) return raw;
  return `•••• ••• ${m.slice(-3)}`;
}

export function formatMobileWa(raw: string) {
  const m = normalizeMobile(raw);
  return m.length === 10 ? `91${m}` : m;
}

export function waLink(number: string, message: string) {
  return `https://wa.me/${formatMobileWa(number)}?text=${encodeURIComponent(message)}`;
}
