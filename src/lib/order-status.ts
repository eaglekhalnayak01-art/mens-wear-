/**
 * The order lifecycle, defined once. The customer timeline, the admin status
 * menu, the dashboard filters and the fulfilment "next step" buttons all read
 * from here, so a new status is added in exactly one place.
 */

export const ORDER_STATUSES = [
  "placed",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type StatusMeta = {
  label: string;
  short: string;
  /** Shown to the customer under the timeline step. */
  customerNote: string;
  /** Filled / outlined dot on the timeline. */
  tone: "neutral" | "accent" | "good" | "bad";
  /** Progress as a percentage of the happy path. */
  step: number;
};

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  placed: {
    label: "Order Placed",
    short: "Placed",
    customerNote: "We have received your order and are verifying it.",
    tone: "neutral",
    step: 12,
  },
  confirmed: {
    label: "Order Confirmed",
    short: "Confirmed",
    customerNote: "Confirmed by the store — your items are being arranged.",
    tone: "accent",
    step: 28,
  },
  processing: {
    label: "Processing",
    short: "Processing",
    customerNote: "Quality check and iron-folding in progress.",
    tone: "accent",
    step: 44,
  },
  packed: {
    label: "Packed",
    short: "Packed",
    customerNote: "Packed and waiting for pickup by our courier.",
    tone: "accent",
    step: 60,
  },
  shipped: {
    label: "Shipped",
    short: "Shipped",
    customerNote: "On the way to your city.",
    tone: "accent",
    step: 76,
  },
  out_for_delivery: {
    label: "Out for Delivery",
    short: "Out for delivery",
    customerNote: "Arriving today — please keep exact change ready for COD.",
    tone: "accent",
    step: 90,
  },
  delivered: {
    label: "Delivered",
    short: "Delivered",
    customerNote: "Delivered. We hope it fits you well.",
    tone: "good",
    step: 100,
  },
  cancelled: {
    label: "Cancelled",
    short: "Cancelled",
    customerNote: "This order was cancelled. Any online payment is refunded in 3–5 days.",
    tone: "bad",
    step: 100,
  },
};

/** The steps drawn on the customer timeline (cancel is shown separately). */
export const TIMELINE_STEPS: OrderStatus[] = [
  "placed",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

export function statusLabel(status: string) {
  return (STATUS_META[status as OrderStatus] ?? { label: "Unknown" }).label;
}

/** Convenience for the customer-facing order cards (never throws on bad data). */
export function statusMeta(status: string) {
  const meta = STATUS_META[status as OrderStatus] ?? STATUS_META.placed;
  return { label: meta.label, short: meta.short, note: meta.customerNote, tone: meta.tone };
}

export function isTerminal(status: string) {
  return status === "delivered" || status === "cancelled";
}

/** What the owner can click next — prevents impossible transitions. */
export function nextStatus(status: OrderStatus): OrderStatus | null {
  if (status === "cancelled") return null;
  const idx = TIMELINE_STEPS.indexOf(status);
  if (idx === -1 || idx === TIMELINE_STEPS.length - 1) return null;
  return TIMELINE_STEPS[idx + 1];
}

export function canCancel(status: OrderStatus) {
  return ["placed", "confirmed", "processing", "packed"].includes(status);
}

/** Shipped onwards: the customer is charged shipping, so stock is already committed. */
export function releasesStock(status: OrderStatus) {
  return ["placed", "confirmed", "processing", "packed"].includes(status);
}
