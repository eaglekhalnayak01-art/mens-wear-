import { z } from "zod";
import { handle } from "@/server/http/handler";
import { getOrderByRef } from "@/server/repositories/orders.repository";
import { customerCancelOrder } from "@/server/services/orders.service";
import { badRequest, forbidden, notFound } from "@/server/http/errors";
import { normalizeMobile } from "@/lib/format";

/**
 * A guest may cancel only by proving the second half of the capability: the
 * reference from the link plus the mobile number the order was placed with. A
 * signed-in customer only needs the reference if the order belongs to them.
 */
const bodySchema = z.object({
  ref: z.string().trim().min(6).max(40),
  mobile: z.string().trim().optional(),
  reason: z.string().trim().max(300).optional(),
});

export const POST = handle({ body: bodySchema, rate: { bucket: "order-cancel", limit: 10, windowMs: 60 * 60_000 } }, async ({ body, customer }) => {
  const order = getOrderByRef(body.ref);
  if (!order) throw notFound("We could not find that order.");

  const ownsIt = customer && order.customerId === customer.id;
  const provesIt = body.mobile ? normalizeMobile(body.mobile) === normalizeMobile(order.customerMobile) : false;
  if (!ownsIt && !provesIt) {
    throw forbidden("Please enter the mobile number this order was placed with so we can confirm it is yours.");
  }

  customerCancelOrder(order.publicRef, body.reason);
  return { ok: true, status: "cancelled" };
});
