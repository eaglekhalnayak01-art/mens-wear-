/**
 * Order placement and fulfilment.
 *
 * Both are single transactions: stock is decremented, sold counters move, a
 * timeline entry is written and the payment row is created together, so an
 * order can never exist without its stock being committed (or released).
 */
import crypto from "node:crypto";
import { invalidate } from "@/server/db/query-cache";
import { all, get, insert, nowIso, run, tx } from "@/server/db";
import { HttpError, badRequest, conflict, notFound } from "@/server/http/errors";
import { quoteCart } from "@/server/services/pricing.service";
import { isOnlineAccepted } from "@/server/services/payments.service";
import { readSettings, type Settings } from "@/server/repositories/settings.repository";
import { saveAddress, upsertCustomerByMobile } from "@/server/repositories/customers.repository";
import { STATUS_META, TIMELINE_STEPS, releasesStock, type OrderStatus } from "@/lib/order-status";
import type { CheckoutInput } from "@/server/services/checkout-types";

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 — phone friendly
const REF_SUFFIX_LENGTH = 8; // ~40 bits: a reference is a lookup key, never a secret to brute force

export function makePublicRef() {
  const year = new Date().getFullYear();
  let suffix = "";
  for (let i = 0; i < REF_SUFFIX_LENGTH; i += 1) suffix += REF_ALPHABET[crypto.randomInt(REF_ALPHABET.length)];
  return `AMW-${year}-${suffix}`;
}

export function expectedDeliveryFrom(settings: Settings) {
  const days = Math.max(settings.deliveryDaysMax, settings.deliveryDaysMin + 1) + settings.dispatchDays;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function assertPaymentAllowed(method: "cod" | "online", settings: Settings) {
  // Kept in one place with the checkout's own option list (payments.service).
  if (method === "cod" && !settings.codEnabled) {
    throw badRequest("Cash on delivery is paused right now. Please choose online payment.", {
      paymentMethod: "Cash on delivery is unavailable for this order.",
    });
  }
  if (method === "online" && !isOnlineAccepted(settings)) {
    throw badRequest("Online payment is not switched on for this shop yet — please choose cash on delivery.", {
      paymentMethod: "Online payment is temporarily unavailable.",
    });
  }
}

function uniquePublicRef() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = makePublicRef();
    if (!get(`SELECT id FROM orders WHERE public_ref = ?`, candidate)) return candidate;
  }
  // Six collisions in a row is a broken RNG, not bad luck — refuse rather than mint a
  // timestamp-shaped reference, which anyone could walk through.
  throw new Error("Could not allocate a unique order reference. Please try the order again.");
}

export type PlacedOrder = {
  publicRef: string;
  id: number;
  total: number;
  itemCount: number;
  paymentMethod: "cod" | "online";
  status: OrderStatus;
  expectedDeliveryAt: string;
  lines: { name: string; qty: number; size: string | null; color: string | null }[];
};

export function placeOrder(input: CheckoutInput, linkedCustomerId?: number): PlacedOrder {
  const settings = readSettings();
  assertPaymentAllowed(input.paymentMethod, settings);

  // Authoritative pricing + stock check (throws 409 when a size just sold out).
  const quote = quoteCart(input.items, settings, { forCheckout: true, paymentMethod: input.paymentMethod });
  const utr = input.paymentMethod === "online" ? (input.paymentReference ?? "").trim() : "";

  if (settings.minOrderValue > 0 && quote.subtotal < settings.minOrderValue) {
    throw badRequest(
      `Our minimum order is ₹${settings.minOrderValue.toLocaleString("en-IN")}. Add a little more to place the order.`,
      { items: "Below the minimum order value" },
    );
  }

  const publicRef = uniquePublicRef();
  const placedAt = nowIso();
  const expectedDeliveryAt = expectedDeliveryFrom(settings);

  const orderId = tx(() => {
    const customerId =
      linkedCustomerId ??
      upsertCustomerByMobile({
        mobile: input.customer.mobile,
        name: input.customer.name,
        email: input.customer.email ?? null,
      });

    const id = insert(
      `INSERT INTO orders
        (public_ref, customer_id, guest_name, guest_mobile, guest_email,
         address_line1, address_line2, city, state, pin, landmark,
         subtotal, discount, shipping, cod_fee, total,
         payment_method, payment_status, status, notes, placed_at, expected_delivery_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      publicRef,
      customerId,
      input.customer.name,
      input.customer.mobile,
      input.customer.email ?? null,
      input.shipping.line1,
      input.shipping.line2 ?? null,
      input.shipping.city,
      input.shipping.state,
      input.shipping.pin,
      input.shipping.landmark ?? null,
      quote.subtotal,
      quote.discount,
      quote.shipping,
      quote.codFee,
      quote.total,
      input.paymentMethod,
      // 'pending' for both: COD is collected at the door, an online transfer is
      // waiting to be matched in the shop's UPI account. orders.payment_status only
      // knows pending | paid | failed | refunded — never invent a fifth value here.
      "pending",
      "placed",
      input.notes?.slice(0, 400) ?? null,
      placedAt,
      expectedDeliveryAt,
      placedAt,
    );

    for (const line of quote.lines) {
      insert(
        `INSERT INTO order_items
          (order_id, product_id, variant_id, name, size, color, unit_price, qty, line_total, image, sku)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        id,
        line.productId,
        line.variantId,
        line.name,
        line.size,
        line.color,
        line.unitPrice,
        line.qty,
        line.lineTotal,
        line.image.src,
        line.sku,
      );
    }

    // A UPI reference is stored on the payment row: the owner matches it against
    // their bank statement, then marks the order paid. Nothing is auto-captured.
    insert(
      `INSERT INTO payments (order_id, provider, intent_id, amount, status, raw_json, created_at)
       VALUES (?,?,?,?,?,?,?)`,
      id,
      input.paymentMethod === "cod" ? "cod" : settings.onlineMode === "qr" ? "upi_qr" : "gateway_pending",
      utr || null,
      quote.total,
      "created",
      utr ? JSON.stringify({ reference: utr, payee: settings.upiPayeeName, upiId: settings.upiId }) : null,
      placedAt,
    );

    insert(
      `INSERT INTO order_events (order_id, status, note, actor_type, created_at) VALUES (?,?,?,?,?)`,
      id,
      "placed",
      utr ? `Order received. Customer paid to UPI and quoted reference ${utr}.` : `Order received by ${settings.shopName}.`,
      "customer",
      placedAt,
    );

    // Commit stock against the shelf.
    for (const line of quote.lines) {
      run(`UPDATE product_variants SET stock = MAX(0, stock - ?) WHERE id = ?`, line.qty, line.variantId);
      run(
        `UPDATE products SET sold_qty = sold_qty + ?, updated_at = ? WHERE id = ?`,
        line.qty,
        placedAt,
        line.productId,
      );
      insert(
        `INSERT INTO stock_movements (product_id, variant_id, delta, reason, order_id, note, created_at)
         VALUES (?,?,?,?,?,?,?)`,
        line.productId,
        line.variantId,
        -line.qty,
        "order",
        id,
        publicRef,
        placedAt,
      );
    }

    if (input.saveAddress && linkedCustomerId) {
      saveAddress(linkedCustomerId, {
        recipient: input.customer.name,
        phone: input.customer.mobile,
        line1: input.shipping.line1,
        line2: input.shipping.line2,
        city: input.shipping.city,
        state: input.shipping.state,
        pin: input.shipping.pin,
        landmark: input.shipping.landmark,
        label: "Home",
      });
    }

    return id;
  });

  invalidate("products", "orders", "shop");

  return {
    publicRef,
    id: orderId,
    total: quote.total,
    itemCount: quote.itemCount,
    paymentMethod: input.paymentMethod,
    status: "placed",
    expectedDeliveryAt,
    lines: quote.lines.map((line) => ({ name: line.name, qty: line.qty, size: line.size, color: line.color })),
  };
}

/**
 * Recording a payment by hand. UPI transfers arrive against the shop's own account,
 * so a human confirms them; the order status is deliberately untouched — paid and
 * packed are two different facts.
 */
export function setPaymentStatus(orderId: number, status: "paid" | "pending" | "failed", actorName?: string) {
  const order = get<{ id: number; status: string; public_ref: string; total: number; payment_status: string }>(
    `SELECT id, status, public_ref, total, payment_status FROM orders WHERE id = ?`,
    orderId,
  );
  if (!order) throw notFound("That order could not be found.");

  const at = nowIso();
  tx(() => {
    run(`UPDATE orders SET payment_status = ?, updated_at = ? WHERE id = ?`, status, at, orderId);
    run(
      `UPDATE payments SET status = ? WHERE order_id = ? AND status <> 'refunded'`,
      status === "paid" ? "captured" : status === "failed" ? "failed" : "created",
      orderId,
    );
    insert(
      `INSERT INTO order_events (order_id, status, note, actor_type, created_at) VALUES (?,?,?,?,?)`,
      orderId,
      order.status,
      `Payment marked ${status}${actorName ? ` by ${actorName}` : ""}.`,
      "admin",
      at,
    );
  });

  invalidate("orders", "shop");
  return { ok: true, status, previous: order.payment_status };
}

/** Puts reserved stock back on the shelf when an order is cancelled in time. */
export function restockOnCancel(orderId: number, at = nowIso()) {
  const items = all<{ product_id: number | null; variant_id: number | null; qty: number }>(
    `SELECT product_id, variant_id, qty FROM order_items WHERE order_id = ?`,
    orderId,
  );
  for (const item of items) {
    if (!item.variant_id || !item.product_id) continue;
    run(`UPDATE product_variants SET stock = stock + ? WHERE id = ?`, item.qty, item.variant_id);
    run(
      `UPDATE products SET sold_qty = MAX(0, sold_qty - ?), updated_at = ? WHERE id = ?`,
      item.qty,
      at,
      item.product_id,
    );
    insert(
      `INSERT INTO stock_movements (product_id, variant_id, delta, reason, order_id, note, created_at)
       VALUES (?,?,?,?,?,?,?)`,
      item.product_id,
      item.variant_id,
      item.qty,
      "cancel",
      orderId,
      "Returned to shelf after cancellation",
      at,
    );
  }
  return items.length;
}

/** Owner action: confirm, pack, ship, deliver, cancel. One timeline row per action. */
export function changeOrderStatus(
  orderId: number,
  status: OrderStatus,
  actor: { type: "admin" | "customer" | "system"; name?: string },
  meta: { note?: string; reason?: string } = {},
) {
  const order = get<{ id: number; status: OrderStatus; payment_method: "cod" | "online"; public_ref: string }>(
    `SELECT id, status, payment_method, public_ref FROM orders WHERE id = ?`,
    orderId,
  );
  if (!order) throw notFound("That order could not be found.");
  if (!(status in STATUS_META)) throw badRequest("Unknown order status.");
  if (order.status === "delivered" && status !== "delivered") {
    throw conflict("A delivered order cannot be moved back. Please handle it as a return instead.");
  }
  if (order.status === "cancelled" && status !== "cancelled") {
    throw conflict("This order is already cancelled.");
  }

  const at = nowIso();
  const shouldRestock = status === "cancelled" && releasesStock(order.status);

  tx(() => {
    const updates = ["status = ?", "updated_at = ?"];
    const params: (string | number)[] = [status, at];

    if (status === "delivered") {
      updates.push("delivered_at = ?");
      params.push(at);
      if (order.payment_method === "cod") {
        updates.push("payment_status = 'paid'");
        run(`UPDATE payments SET status = 'captured' WHERE order_id = ? AND provider = 'cod'`, orderId);
      }
    }
    if (status === "cancelled") {
      updates.push("cancelled_reason = ?");
      params.push((meta.reason ?? "Cancelled from the dashboard").slice(0, 200));
      if (order.payment_method === "online") {
        updates.push("payment_status = 'refunded'");
        run(`UPDATE payments SET status = 'refunded' WHERE order_id = ?`, orderId);
      }
    }

    run(`UPDATE orders SET ${updates.join(", ")} WHERE id = ?`, ...params, orderId);

    const note =
      meta.note?.slice(0, 300) ||
      (status === "cancelled"
        ? `Order cancelled by ${actor.type === "admin" ? "the store" : "the customer"}.`
        : STATUS_META[status].label);

    insert(
      `INSERT INTO order_events (order_id, status, note, actor_type, created_at) VALUES (?,?,?,?,?)`,
      orderId,
      status,
      note,
      actor.type,
      at,
    );

    if (shouldRestock) restockOnCancel(orderId, at);
  });

  invalidate("products", "orders", "shop");

  return { status, restocked: shouldRestock };
}

/** Customer-initiated cancellation — allowed only while the parcel can be stopped. */
export function customerCancelOrder(publicRef: string, reason?: string) {
  const order = get<{ id: number; status: OrderStatus }>(
    `SELECT id, status FROM orders WHERE public_ref = ? COLLATE NOCASE`,
    publicRef.trim(),
  );
  if (!order) throw notFound("We could not find that order.");
  if (!releasesStock(order.status)) {
    throw conflict(
      order.status === "delivered"
        ? "This order is already delivered, so it cannot be cancelled. Please use our return process instead."
        : "Your parcel has already left the shop, so it cannot be cancelled here. Call us and we will sort it out.",
    );
  }
  changeOrderStatus(order.id, "cancelled", { type: "customer" }, { reason: reason ?? "Cancelled by the customer" });
  invalidate("orders");
  return { ok: true };
}

export function timelineFor(status: OrderStatus) {
  const idx = TIMELINE_STEPS.indexOf(status);
  return TIMELINE_STEPS.map((step, i) => ({
    status: step,
    state:
      status === "cancelled"
        ? i === 0
          ? ("done" as const)
          : ("skipped" as const)
        : i < idx
          ? ("done" as const)
          : i === idx
            ? ("current" as const)
            : ("pending" as const),
  }));
}
