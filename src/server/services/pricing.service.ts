/**
 * Cart pricing. The only place money is calculated.
 *
 * The browser sends `{variantId, qty}` and nothing else — prices, discounts,
 * shipping and COD fees are recomputed here from the database every time, so a
 * tampered payload can never change what a customer is charged.
 */
import { all } from "@/server/db";
import { HttpError, outOfStock } from "@/server/http/errors";
import type { Settings } from "@/server/repositories/settings.repository";
import type { CartLineInput, Quote, QuotedLine } from "@/server/repositories/types";
import { placeholderImage } from "@/server/repositories/products.repository";

type VariantRow = {
  variant_id: number;
  product_id: number;
  name: string;
  slug: string;
  status: string;
  price: number;
  variant_price: number | null;
  compare_at_price: number | null;
  stock: number;
  size: string | null;
  color: string | null;
  sku: string | null;
  image: string | null;
  payment_mode: string | null;
};

function loadVariants(ids: number[]) {
  const rows = all<VariantRow>(
    `SELECT v.id AS variant_id, p.id AS product_id, p.name, p.slug, p.status,
            p.price, v.price AS variant_price, p.compare_at_price, v.stock,
            p.payment_mode,
            s.label AS size, c.name AS color, v.sku,
            (SELECT src FROM product_images pi WHERE pi.product_id = p.id
              ORDER BY pi.is_primary DESC, pi.sort LIMIT 1) AS image
       FROM product_variants v
       JOIN products p ON p.id = v.product_id
       LEFT JOIN sizes s ON s.id = v.size_id
       LEFT JOIN colors c ON c.id = v.color_id
      WHERE v.id IN (${ids.map(() => "?").join(",")})`,
    ...ids,
  );
  return new Map(rows.map((row) => [row.variant_id, row]));
}

export function quoteCart(
  lines: CartLineInput[],
  settings: Settings,
  options: { paymentMethod?: "cod" | "online"; forCheckout?: boolean } = {},
): Quote {
  if (!lines.length) {
    return {
      lines: [],
      subtotal: 0,
      mrpTotal: 0,
      discount: 0,
      shipping: 0,
      codFee: 0,
      total: 0,
      itemCount: 0,
      freeShippingGap: settings.freeDeliveryOver,
      minOrderShortfall: 0,
      notices: [],
      allowsCod: true,
      allowsOnline: true,
    };
  }

  const merged = new Map<number, number>();
  for (const line of lines.slice(0, 60)) {
    const qty = Math.max(1, Math.min(10, Math.trunc(line.qty) || 1));
    merged.set(line.variantId, (merged.get(line.variantId) ?? 0) + qty);
  }

  const catalogue = loadVariants([...merged.keys()]);
  const quoted: QuotedLine[] = [];
  const notices: string[] = [];

  for (const [variantId, qty] of merged) {
    const row = catalogue.get(variantId);
    if (!row) {
      notices.push("One item in your cart is no longer available and has been removed.");
      continue;
    }
    if (row.status !== "published") {
      notices.push(`${row.name} is no longer on sale and has been removed from your cart.`);
      continue;
    }
    if (row.stock <= 0) {
      if (options.forCheckout) throw outOfStock(`${row.name} (${[row.size, row.color].filter(Boolean).join(" · ")}) is out of stock.`);
      notices.push(`${row.name} is currently out of stock.`);
      continue;
    }
    const maxQty = Math.min(10, row.stock);
    const finalQty = Math.min(qty, maxQty);
    if (finalQty !== qty) {
      notices.push(`Only ${row.stock} left of ${row.name}, so we set the quantity to ${finalQty}.`);
    }
    const unitPrice = row.variant_price ?? row.price;
    quoted.push({
      productId: row.product_id,
      variantId,
      name: row.name,
      slug: row.slug,
      size: row.size,
      color: row.color,
      unitPrice,
      compareAtPrice: row.compare_at_price,
      qty: finalQty,
      lineTotal: Math.round(unitPrice * finalQty),
      image: { src: row.image ?? placeholderImage(row.slug), alt: row.name },
      sku: row.sku,
      availableStock: row.stock,
      maxQtyReached: finalQty >= maxQty,
      paymentMode: row.payment_mode === "cod" || row.payment_mode === "online" ? row.payment_mode : "both",
    });
  }

  const subtotal = quoted.reduce((sum, line) => sum + line.lineTotal, 0);
  const mrpTotal = quoted.reduce((sum, line) => sum + Math.round((line.compareAtPrice ?? line.unitPrice) * line.qty), 0);
  const discount = Math.max(0, mrpTotal - subtotal);
  const itemCount = quoted.reduce((sum, line) => sum + line.qty, 0);

  if (options.forCheckout && itemCount === 0) {
    throw new HttpError(400, "validation", "Your cart is empty — add something you like first.");
  }

  // Per-style payment rules. A made-to-order jacket can be prepaid-only, a heavy
  // coat cash-only; the basket as a whole can only use a method every line accepts.
  const onlineOnly = quoted.filter((line) => line.paymentMode === "online");
  const codOnly = quoted.filter((line) => line.paymentMode === "cod");
  const allowsCod = onlineOnly.length === 0;
  const allowsOnline = codOnly.length === 0;
  const payName = (lines: QuotedLine[]) =>
    lines.length === 1 ? lines[0].name : `${lines[0].name} and ${lines.length - 1} other line${lines.length === 2 ? "" : "s"}`;
  if (options.paymentMethod === "cod" && onlineOnly.length > 0) {
    const message = `${payName(onlineOnly)} can only be paid online — choose UPI at the next step.`;
    if (options.forCheckout) throw new HttpError(409, "conflict", message);
    notices.push(message);
  }
  if (options.paymentMethod === "online" && codOnly.length > 0) {
    const message = `${payName(codOnly)} is cash on delivery only. Pay at the door instead.`;
    if (options.forCheckout) throw new HttpError(409, "conflict", message);
    notices.push(message);
  }

  let shipping = subtotal > 0 ? settings.deliveryFee : 0;
  if (settings.freeDeliveryOver > 0 && subtotal >= settings.freeDeliveryOver) shipping = 0;
  const codFee = options.paymentMethod === "cod" ? settings.codFee : 0;
  const total = Math.max(0, subtotal + shipping + codFee);

  return {
    lines: quoted,
    subtotal,
    mrpTotal,
    discount,
    shipping,
    codFee,
    total,
    itemCount,
    freeShippingGap: Math.max(0, settings.freeDeliveryOver - subtotal),
    minOrderShortfall: Math.max(0, settings.minOrderValue - subtotal),
    notices,
    allowsCod,
    allowsOnline,
  };
}

export function shippingFor(subtotal: number, settings: Settings) {
  if (settings.freeDeliveryOver > 0 && subtotal >= settings.freeDeliveryOver) return 0;
  return subtotal > 0 ? settings.deliveryFee : 0;
}

/** Compact version used by /api/cart/quote (keeps the payload small). */
export function quoteToClientPayload(quote: Quote) {
  return {
    lines: quote.lines.map((line) => ({
      variantId: line.variantId,
      productId: line.productId,
      name: line.name,
      slug: line.slug,
      size: line.size,
      color: line.color,
      unitPrice: line.unitPrice,
      compareAtPrice: line.compareAtPrice,
      qty: line.qty,
      lineTotal: line.lineTotal,
      image: line.image,
      sku: line.sku,
      availableStock: line.availableStock,
      maxQtyReached: line.maxQtyReached,
    })),
    subtotal: quote.subtotal,
    discount: quote.discount,
    shipping: quote.shipping,
    codFee: quote.codFee,
    total: quote.total,
    itemCount: quote.itemCount,
    freeShippingGap: quote.freeShippingGap,
    minOrderShortfall: quote.minOrderShortfall,
    notices: quote.notices,
    allowsCod: quote.allowsCod,
    allowsOnline: quote.allowsOnline,
  };
}
