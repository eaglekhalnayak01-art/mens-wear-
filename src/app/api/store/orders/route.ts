import { z } from "zod";
import { handle } from "@/server/http/handler";
import { consume } from "@/server/security/rate-limit";
import { rateLimited } from "@/server/http/errors";
import { checkoutSchema } from "@/server/validation/schemas";
import { placeOrder } from "@/server/services/orders.service";
import { notifyOrderPlaced } from "@/server/services/notifications.service";
import { readSettings } from "@/server/repositories/settings.repository";
import { orderTrackingPath } from "@/server/security/order-access";

/**
 * Placing an order. Everything is re-derived server-side: the items are only
 * `{variantId, qty}`, prices come from `quoteCart`, stock is decremented inside a
 * transaction, and the response carries the tracking reference. A guest can call
 * this — no session required, and if one exists the order is linked to it.
 */
const bodySchema = checkoutSchema.extend({
  /** Client cart snapshot; ignored for pricing, used only to fail fast on an empty cart. */
  honeypot: z.string().max(0).optional(),
});

export const POST = handle<z.infer<typeof bodySchema>>(
  { body: bodySchema, rate: { bucket: "place-order", limit: 40, windowMs: 60 * 60_000 } },
  async ({ body, customer }) => {
    if (body.honeypot) return { ok: false }; // silently drop bots

    // The route bucket above is per IP; this one is per phone number, so a prank from
    // a hundred connections on the same number still stops at four orders an hour.
    const mobile = body.customer.mobile.replace(/\D/g, "");
    const perNumber = consume(`place-order-mobile:${mobile}`, 4, 60 * 60_000);
    if (!perNumber.ok) {
      throw rateLimited(
        "Too many orders from this number in one hour. Please call the shop on WhatsApp and we will place them for you.",
        perNumber.retryAfterSec,
      );
    }

    const order = placeOrder(
      {
        customer: body.customer,
        shipping: body.shipping,
        paymentMethod: body.paymentMethod,
        paymentReference: body.paymentReference,
        notes: body.notes,
        items: body.items.map((item) => ({ variantId: item.variantId, qty: item.qty })),
        saveAddress: body.saveAddress,
      },
      customer?.id,
    );

    const settings = readSettings();
    // Notifications must never fail a checkout, so the rejection is swallowed.
    void notifyOrderPlaced(
      {
        publicRef: order.publicRef,
        customerName: body.customer.name,
        customerMobile: body.customer.mobile,
        total: order.total,
        items: order.itemCount,
        paymentMethod: order.paymentMethod,
        paymentReference: body.paymentReference,
        city: body.shipping.city,
      },
      settings,
    ).catch(() => undefined);

    return {
      ok: true,
      order: {
        ref: order.publicRef,
        id: order.id,
        total: order.total,
        itemCount: order.itemCount,
        paymentMethod: order.paymentMethod,
        status: order.status,
        expectedDeliveryAt: order.expectedDeliveryAt,
        lines: order.lines,
        // Signed capability link, not the bare reference: this is the URL we hand the
        // customer after checkout and the one put in their WhatsApp confirmation.
        trackPath: orderTrackingPath(order.publicRef),
      },
    };
  },
);
