import { z } from "zod";
import { handle } from "@/server/http/handler";
import { getOrderByRef } from "@/server/repositories/orders.repository";
import { canReadOrder, orderTrackingPath } from "@/server/security/order-access";
import { forbidden } from "@/server/http/errors";

/**
 * Trades an order reference + the mobile it was placed with for a signed tracking link.
 *
 * Deliberately vague on failure: the same sentence comes back for "no such order" and
 * "wrong number", so this endpoint cannot be used to check whether a reference is real.
 *
 * Thirty attempts per device per ten minutes, not eight: a shared office or a carrier's
 * NAT puts many customers behind one IP, and a limit that punishes them for it is a bug
 * dressed as a control. Walking 40-bit references is hopeless long before 30 tries.
 * A signed-in customer who owns the order does not have to re-type anything.
 */
const bodySchema = z.object({
  ref: z.string().trim().min(6).max(40),
  mobile: z.string().trim().regex(/^\d{10}$/, "Enter the 10-digit mobile number on the order."),
});

const NO_MATCH = "We could not match that reference with that mobile number. Check both and try again — or call us on WhatsApp and we will read it out to you.";

export const POST = handle<z.infer<typeof bodySchema>>(
  { auth: "public", body: bodySchema, rate: { bucket: "order-verify", limit: 30, windowMs: 10 * 60_000 } },
  async ({ body, customer }) => {
    const order = getOrderByRef(body.ref.toUpperCase());
    if (!order) throw forbidden(NO_MATCH);

    const allowed = canReadOrder(
      { customerId: order.customerId, customerMobile: order.customerMobile },
      { customerId: customer?.id ?? null, mobile: body.mobile },
    );
    if (!allowed) throw forbidden(NO_MATCH);

    return { ok: true as const, path: orderTrackingPath(order.publicRef) };
  },
);
