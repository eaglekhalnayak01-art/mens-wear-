import { z } from "zod";
import { handle } from "@/server/http/handler";
import { cartLineSchema } from "@/server/validation/schemas";
import { quoteCart, quoteToClientPayload } from "@/server/services/pricing.service";
import { readSettings } from "@/server/repositories/settings.repository";

/**
 * The browser only ever sends `{variantId, qty}`. Prices, discounts, shipping
 * and the COD fee are recalculated from the database here, so a tampered cart can
 * change nothing — the totals on screen and the totals on the order come from
 * this one function.
 */
const bodySchema = z.object({
  items: z.array(cartLineSchema).min(1, "Your cart is empty").max(40),
  paymentMethod: z.enum(["cod", "online"]).optional(),
  forCheckout: z.boolean().optional(),
});

export const POST = handle({ body: bodySchema }, async ({ body }) => {
  const settings = readSettings();
  // Stock errors are deliberately not thrown here: the cart shows what it found
  // and only checkout refuses the order, so a shopper is never blocked mid-browse.
  const quote = quoteCart(body.items, settings, {
    paymentMethod: body.paymentMethod,
    forCheckout: body.forCheckout === true,
  });
  return quoteToClientPayload(quote);
});
