/**
 * Owner + customer notifications.
 *
 * Deliberately not wired to a paid provider: on order events we log a
 * structured line and build a ready-to-send WhatsApp message (which the owner
 * can tap in the dashboard). Swapping in WhatsApp Business API / MSG91 / email
 * means implementing `send()` below — no call site changes.
 */
import { money } from "@/lib/format";
import { env } from "@/server/env";
import type { Settings } from "@/server/repositories/settings.repository";

export type NotificationEvent =
  | "order:placed"
  | "order:confirmed"
  | "order:packed"
  | "order:shipped"
  | "order:delivered"
  | "order:cancelled";

export type NotificationPayload = {
  event: NotificationEvent;
  to: string;
  subject: string;
  body: string;
  meta?: Record<string, string | number>;
};

const CHANNELS = ["whatsapp", "sms", "email"] as const;

function waLink(number: string, body: string) {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}?text=${encodeURIComponent(body)}`;
}

export function buildWhatsAppOrderMessage(order: {
  publicRef: string;
  customerName: string;
  total: number;
  items: number;
  paymentMethod: string;
}) {
  return [
    `New order ${order.publicRef}`,
    `${order.customerName} · ${order.items} item${order.items === 1 ? "" : "s"}`,
    `Total ${money(order.total)} (${order.paymentMethod === "cod" ? "Cash on delivery" : "Online payment"})`,
    `Please share your delivery address here so we can pack it today.`,
  ].join("\n");
}

/** Called right after an order is created — must never break the checkout. */
export async function notifyOrderPlaced(
  order: { publicRef: string; customerName: string; customerMobile: string; total: number; items: number; paymentMethod: string },
  settings: Settings,
) {
  const message: NotificationPayload = {
    event: "order:placed",
    to: settings.whatsapp,
    subject: `New order ${order.publicRef}`,
    body: buildWhatsAppOrderMessage(order),
    meta: { orderId: order.publicRef, amount: order.total },
  };

  const ownerLink = settings.whatsapp
    ? waLink(
        settings.whatsapp,
        `Order ${order.publicRef} received ✅\n${order.customerName} · ${order.items} item(s) · ${money(order.total)}\nMobile: ${order.customerMobile}`,
      )
    : null;

  console.log(
    JSON.stringify(
      {
        tag: "notification",
        channel: CHANNELS[0],
        ...message,
        ownerWhatsAppLink: ownerLink,
      },
      null,
      0,
    ),
  );

  return { queued: env.otp.transport !== "off", ownerLink };
}

/** Customer-side confirmation message (surfaced as a one-tap WhatsApp link). */
export function customerConfirmationLink(settings: Settings, order: { publicRef: string; customerName: string; total: number }) {
  const body = `Hello ${settings.shopName}, I just placed order ${order.publicRef} (${order.customerName}, ${money(
    order.total,
  )}). Please confirm it for me.`;
  return settings.whatsapp ? waLink(settings.whatsapp, body) : null;
}
