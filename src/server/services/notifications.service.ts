/**
 * Owner + customer notifications.
 *
 * Every alert is written to the `notifications` table first — the dashboard bell and
 * the owner's inbox read that, so an alert is never the only copy of the fact. Then,
 * best-effort and never allowed to fail the request, it also:
 *   • POSTs to `notifyWebhookUrl` (any SMS/WhatsApp/Slack bridge can sit behind it),
 *   • prepares a one-tap WhatsApp link for the owner's number,
 *   • keeps the console line for a sandbox with no network.
 *
 * Wiring a real provider means implementing `post()` below — no call site changes.
 */
import { money } from "@/lib/format";
import { createNotification } from "@/server/repositories/notifications.repository";
import type { Settings } from "@/server/repositories/settings.repository";

export type NotificationEvent =
  | "order:placed"
  | "order:payment"
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

export type OrderAlert = {
  publicRef: string;
  customerName: string;
  customerMobile: string;
  total: number;
  items: number;
  paymentMethod: string;
  paymentReference?: string;
  city?: string;
};

function alertTitle(event: NotificationEvent, order: OrderAlert) {
  if (event === "order:payment") return `UPI reference for ${order.publicRef}`;
  if (event === "order:cancelled") return `Order ${order.publicRef} cancelled`;
  return `New order ${order.publicRef} · ${money(order.total)}`;
}

function alertBody(event: NotificationEvent, order: OrderAlert) {
  const payment = order.paymentReference
    ? `Paid to UPI, reference ${order.paymentReference}`
    : order.paymentMethod === "cod"
      ? "Cash on delivery"
      : "Paid online";
  return [
    `${order.customerName} · ${order.customerMobile}`,
    order.city ? `Deliver to ${order.city}` : null,
    `${order.items} item${order.items === 1 ? "" : "s"} · ${payment}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Persists the alert and tries each configured channel. Never throws. */
export async function notifyOrderPlaced(order: OrderAlert, settings: Settings) {
  const event: NotificationEvent = order.paymentReference ? "order:payment" : "order:placed";
  const title = alertTitle(event, order);
  const body = alertBody(event, order);
  const enabled = settings.notifyOrderEnabled;

  const inboxId = createNotification({
    event,
    title,
    body,
    channel: "inbox",
    target: settings.shopName,
    orderRef: order.publicRef,
  });

  if (!enabled) return { queued: false, inboxId, ownerLink: null as string | null };

  const ownerNumber = settings.notifyMobile || settings.whatsapp;
  const ownerLink = ownerNumber
    ? waLink(
        ownerNumber,
        `${title}\n${body}\nOpen the dashboard to confirm and pack it.`,
      )
    : null;

  if (ownerNumber) {
    createNotification({
      event,
      title,
      body,
      channel: "whatsapp",
      target: ownerNumber,
      orderRef: order.publicRef,
      sentAt: new Date().toISOString(),
    });
  }

  // A webhook is the seam for a real SMS/WhatsApp-business bridge: same payload,
  // server-side only, failure recorded but never fatal.
  if (settings.notifyWebhookUrl) {
    void post(settings.notifyWebhookUrl, { event, title, body, order: order, mobile: ownerNumber })
      .then((ok) =>
        createNotification({
          event,
          title,
          body: ok ? "Webhook accepted the alert." : "Webhook did not accept the alert.",
          channel: "webhook",
          target: settings.notifyWebhookUrl,
          orderRef: order.publicRef,
          sentAt: ok ? new Date().toISOString() : null,
        }),
      )
      .catch(() => undefined);
  }

  // The console line is the sandbox stand-in for a real sender: `npm run dev` output
  // is where you can see exactly what a customer-facing SMS/WhatsApp bridge would post.
  console.log(JSON.stringify({ tag: "notification", event, to: ownerNumber, subject: title, body }, null, 0));

  return { queued: true, inboxId, ownerLink };
}

async function post(url: string, payload: unknown) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * The “Send a test alert” button in Settings. It pushes one real row through the same
 * code path an order uses — inbox, owner WhatsApp link, webhook — so the owner can
 * prove the number is right before the first order arrives at 9 pm.
 */
export async function sendTestAlert(settings: Settings) {
  const ownerNumber = settings.notifyMobile || settings.whatsapp;
  const enabled = settings.notifyOrderEnabled;
  const title = enabled ? "Test alert from the dashboard" : "Alerts are switched off";
  const body = enabled
    ? `If you can read this in the bell, a new order will reach ${ownerNumber ? `you on ${ownerNumber}` : "the dashboard"} the same way.`
    : "Turn on “Alert me when an order arrives” to start receiving them.";

  createNotification({
    event: "order:placed",
    title,
    body,
    channel: "inbox",
    target: settings.shopName,
    orderRef: null,
  });

  let webhookOk: boolean | null = null;
  if (enabled && settings.notifyWebhookUrl) {
    webhookOk = await post(settings.notifyWebhookUrl, { event: "test", title, body });
  }

  return {
    ok: true,
    enabled,
    mobile: ownerNumber || null,
    email: settings.notifyEmail || null,
    webhookUrl: settings.notifyWebhookUrl || null,
    webhookOk,
    whatsappLink:
      enabled && ownerNumber
        ? waLink(ownerNumber, `${title}\n${body}\n(No order was placed — this was only a test.)`)
        : null,
  };
}

/** Status changes and cancellations land in the same inbox. */
export function notifyOwner(event: NotificationEvent, input: { title: string; body: string; orderRef?: string }) {
  return createNotification({ event, ...input, channel: "inbox" });
}

/** Customer-side confirmation message (surfaced as a one-tap WhatsApp link). */
export function customerConfirmationLink(settings: Settings, order: { publicRef: string; customerName: string; total: number }) {
  const body = `Hello ${settings.shopName}, I just placed order ${order.publicRef} (${order.customerName}, ${money(
    order.total,
  )}). Please confirm it for me.`;
  return settings.whatsapp ? waLink(settings.whatsapp, body) : null;
}
