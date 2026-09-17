/**
 * Who is allowed to see one order.
 *
 * An order carries a name, a phone number and a delivery address, so "anyone who can
 * guess the reference" is not a policy — it is a leak. Three ways in, and only three:
 *
 *   1. owner      — the signed-in customer the order belongs to (`orders.customer_id`)
 *   2. link       — a reference carrying our signature, minted at checkout and put in the
 *                   customer's WhatsApp/SMS/email. The signature, not the reference, is the
 *                   capability: it cannot be forged or guessed, and it never appears in the
 *                   address bar of someone who only knows the number.
 *   3. mobile     — the shop's front desk path: reference + the mobile the order was placed
 *                   with. Verified server-side, rate limited, and it hands back a signed link
 *                   instead of rendering the order in the same request.
 *
 * Everything else gets a 403 with the same wording whether the order exists or not, so the
 * endpoint cannot be used to enumerate references.
 */
import crypto from "node:crypto";
import { env } from "@/server/env";
import { normalizeMobile } from "@/lib/format";

const SEPARATOR = ".";
const SIG_LENGTH = 22; // base64url characters of a 256-bit digest we keep

function signature(value: string) {
  return crypto
    .createHmac("sha256", env.sessionSecret)
    .update(`order-read:${value}`)
    .digest("base64url")
    .slice(0, SIG_LENGTH);
}

/** Signed, copy-pasteable tracking link for one order reference. */
export function orderAccessToken(ref: string) {
  const clean = ref.trim().toUpperCase();
  return `${clean}${SEPARATOR}${signature(clean)}`;
}

export function orderTrackingPath(ref: string) {
  return `/order/${orderAccessToken(ref)}`;
}

/** Splits a URL segment into the reference plus whether our signature matched. */
export function readOrderToken(token: string): { ref: string; signed: boolean } {
  const raw = decodeURIComponent(token ?? "").trim();
  const at = raw.lastIndexOf(SEPARATOR);
  if (at <= 0) return { ref: raw.toUpperCase(), signed: false };

  // The reference half is case-insensitive (people type it), the signature half is not:
  // base64url is mixed-case, so upper-casing the whole segment would reject our own links.
  const ref = raw.slice(0, at).toUpperCase();
  const given = Buffer.from(raw.slice(at + 1), "utf8");
  const expected = Buffer.from(signature(ref), "utf8");
  const signed = given.length === expected.length && crypto.timingSafeEqual(given, expected);
  return { ref, signed };
}

export type OrderOwnershipInput = {
  customerId: number | null;
  customerMobile: string | null;
};

/** The only authorisation decision made about an order on the storefront. */
export function canReadOrder(
  order: OrderOwnershipInput,
  viewer: { customerId?: number | null; signed?: boolean; mobile?: string | null },
) {
  if (viewer.signed) return true;
  if (viewer.customerId && order.customerId && viewer.customerId === order.customerId) return true;
  const claimed = (viewer.mobile ?? "").trim();
  if (claimed.length >= 10 && order.customerMobile) {
    return normalizeMobile(claimed) === normalizeMobile(order.customerMobile);
  }
  return false;
}

/**
 * The shop keeps old references readable (they are already printed on slips and in SMS),
 * but a short random suffix is thin against an unauthenticated page. References are now
 * 8 characters; this constant is what the verifier and the docs agree on.
 */
export const REF_SUFFIX_LENGTH = 8;
