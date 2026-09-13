/**
 * Payment methods.
 *
 * Version 1 ships Cash on Delivery plus an *integration-ready* online path: the
 * order, `payments` row, status machine and UI slots already exist, so turning
 * on Razorpay/UPI is a matter of filling `createOnlineIntent` + a verify route.
 * No gateway secret ever reaches the browser; the key id is handed out only when
 * a real gateway is configured.
 */
import { env } from "@/server/env";
import { HttpError } from "@/server/http/errors";
import type { Settings } from "@/server/repositories/settings.repository";

export type PaymentOption = {
  id: "cod" | "online";
  label: string;
  hint: string;
  available: boolean;
  fee: number;
  badge?: string;
};

export function paymentOptions(settings: Settings): PaymentOption[] {
  const gatewayLive = env.payments.onlineEnabled;
  return [
    {
      id: "cod",
      label: "Cash on Delivery",
      hint: "Pay the delivery partner in cash when your parcel arrives.",
      available: settings.codEnabled,
      fee: settings.codFee,
      badge: "Most orders",
    },
    {
      id: "online",
      label: "UPI / Card / Net banking",
      hint: gatewayLive
        ? "Pay securely with UPI, card or net banking."
        : "We will take payment online soon. For now, pay by cash on delivery or on WhatsApp.",
      available: settings.onlineEnabled && gatewayLive,
      fee: 0,
      badge: gatewayLive ? undefined : "Coming soon",
    },
  ];
}

export type OnlineIntent = {
  provider: "razorpay";
  keyId: string;
  amountMinor: number;
  currency: string;
  orderRef: string;
  checkoutToken: string;
};

/**
 * Seam for the gateway. With no keys configured we fail with a clean 503 that
 * the UI turns into a friendly "pay another way" state instead of a crash.
 */
export async function createOnlineIntent(input: { orderId: number; orderRef: string; amount: number; customerName: string; customerEmail?: string }): Promise<OnlineIntent> {
  if (!env.payments.onlineEnabled) {
    throw new HttpError(
      503,
      "conflict",
      "Online payment is not switched on for this shop yet. Please place the order with cash on delivery — we will message you a payment link on WhatsApp.",
    );
  }
  // Real implementation: POST https://api.razorpay.com/v1/orders with basic auth
  // (key id + secret held in env), store the returned id in `payments.intent_id`,
  // then verify `x-razorpay-signature` in /api/payments/razorpay/callback.
  const { createHmac, randomBytes } = await import("node:crypto");
  const checkoutToken = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", env.payments.razorpayKeySecret)
    .update(`${input.orderRef}:${checkoutToken}`)
    .digest("base64");
  void signature; // consumed by the gateway SDK when wired up
  return {
    provider: "razorpay",
    keyId: env.payments.razorpayKeyId,
    amountMinor: Math.round(input.amount * 100), // paise
    currency: "INR",
    orderRef: input.orderRef,
    checkoutToken,
  };
}
