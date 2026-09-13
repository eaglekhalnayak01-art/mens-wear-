/**
 * Order reads. Status *writes* live in services/orders.service.ts so the
 * timeline entry, the stock movement and the payment row always move together.
 */
import { all, get } from "@/server/db";
import type { OrderDetail, OrderSummary } from "@/server/repositories/types";

/* Zero-shaped fallback for the dashboard aggregates: a fresh database with no
   orders yet should read as 0, not as an object with no keys. */
const EMPTY_STATS = {
  orders: 0, revenue: 0, pending: 0, delivered: 0, cancelled: 0, aov: 0, todayOrders: 0, todayRevenue: 0, units: 0,
  products: 0, published: 0, hidden: 0, low: 0, out: 0, stockValue: 0,
  customers: 0, newCustomers: 0,
};

const ORDER_SELECT = `
  SELECT o.id, o.public_ref AS publicRef, o.placed_at AS placedAt, o.status,
         o.payment_method AS paymentMethod, o.payment_status AS paymentStatus,
         o.total, o.customer_id AS customerId,
         o.guest_name AS customerName, o.guest_mobile AS customerMobile,
         o.subtotal, o.discount, o.shipping, o.city, o.pin,
         o.expected_delivery_at AS expectedDeliveryAt,
         (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS itemCount,
         (SELECT SUM(qty) FROM order_items oi WHERE oi.order_id = o.id) AS units
    FROM orders o`;

const FULL_ORDER_SELECT = `
  SELECT o.id, o.public_ref AS publicRef, o.placed_at AS placedAt, o.status,
         o.payment_method AS paymentMethod, o.payment_status AS paymentStatus,
         o.subtotal, o.discount, o.shipping, o.cod_fee AS codFee, o.total,
         o.guest_name AS customerName, o.guest_mobile AS customerMobile, o.guest_email AS email,
         o.address_line1 AS line1, o.address_line2 AS line2, o.city, o.state, o.pin, o.landmark,
         o.notes, o.cancelled_reason AS cancelledReason,
         (SELECT py.intent_id FROM payments py WHERE py.order_id = o.id ORDER BY py.id DESC LIMIT 1) AS paymentReference,
         o.expected_delivery_at AS expectedDeliveryAt, o.delivered_at AS deliveredAt,
         o.customer_id AS customerId, o.updated_at AS updatedAt
    FROM orders o`;

export type AdminOrderFilter = {
  q?: string;
  status?: string;
  payment?: string;
  from?: string;
  to?: string;
  sort?: "newest" | "oldest" | "value_high" | "value_low";
  page?: number;
  perPage?: number;
};

const ORDER_SORTS: Record<string, string> = {
  newest: "o.placed_at DESC, o.id DESC",
  oldest: "o.placed_at ASC",
  value_high: "o.total DESC",
  value_low: "o.total ASC",
};

export function listAdminOrders(filter: AdminOrderFilter = {}) {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (filter.q?.trim()) {
    const like = `%${filter.q.trim().replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    clauses.push(
      `(o.public_ref LIKE ? ESCAPE '\\' OR o.guest_name LIKE ? ESCAPE '\\' OR o.guest_mobile LIKE ? ESCAPE '\\'
        OR o.city LIKE ? ESCAPE '\\' OR o.pin LIKE ? ESCAPE '\\'
        OR EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.name LIKE ? ESCAPE '\\'))`,
    );
    params.push(like, like, like, like, like, like);
  }

  if (filter.status && filter.status !== "all") {
    if (filter.status === "open") {
      clauses.push("o.status IN ('placed','confirmed','processing','packed')");
    } else {
      clauses.push("o.status = ?");
      params.push(filter.status);
    }
  }
  if (filter.payment === "cod" || filter.payment === "online") {
    clauses.push("o.payment_method = ?");
    params.push(filter.payment);
  }
  if (filter.payment === "pending" || filter.payment === "paid") {
    clauses.push("o.payment_status = ?");
    params.push(filter.payment);
  }
  if (filter.from) {
    clauses.push("date(o.placed_at) >= date(?)");
    params.push(filter.from);
  }
  if (filter.to) {
    clauses.push("date(o.placed_at) <= date(?)");
    params.push(filter.to);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const perPage = filter.perPage ?? 20;
  const page = Math.max(1, filter.page ?? 1);

  const total = get<{ n: number; sum: number }>(
    `SELECT COUNT(*) AS n, COALESCE(SUM(o.total),0) AS sum FROM orders o ${where}`,
    ...params,
  );

  const rows = all<OrderSummary & { units: number }>(
    `${ORDER_SELECT} ${where} ORDER BY ${ORDER_SORTS[filter.sort ?? "newest"] ?? ORDER_SORTS.newest} LIMIT ? OFFSET ?`,
    ...params,
    perPage,
    (page - 1) * perPage,
  );

  const items = rows.map((row) => ({
    ...row,
    preview: all<{ name: string; qty: number; size: string | null }>(
      `SELECT name, qty, size FROM order_items WHERE order_id = ? ORDER BY id LIMIT 4`,
      row.id,
    ),
  }));

  return {
    items,
    total: total?.n ?? 0,
    matchingValue: total?.sum ?? 0,
    page,
    perPage,
    pages: Math.max(1, Math.ceil((total?.n ?? 0) / perPage)),
    statusCounts: orderStatusCounts(),
  };
}

export function orderStatusCounts(): Record<string, { count: number; value: number }> {
  const rows = all<{ status: string; n: number; value: number }>(
    `SELECT status, COUNT(*) AS n, COALESCE(SUM(total),0) AS value FROM orders GROUP BY status`,
  );
  const map: Record<string, { count: number; value: number }> = {};
  let total = 0;
  for (const row of rows) {
    map[row.status] = { count: row.n, value: row.value };
    total += row.n;
  }
  return { ...map, all: { count: total, value: 0 } };
}

export function buildOrderDetail(row: Record<string, unknown>): OrderDetail {
  const id = Number(row.id);
  return {
    id,
    publicRef: String(row.publicRef),
    placedAt: String(row.placedAt),
    status: String(row.status),
    paymentMethod: String(row.paymentMethod),
    paymentStatus: String(row.paymentStatus),
    total: Number(row.total),
    itemCount: Number(
      get<{ n: number }>(`SELECT COALESCE(SUM(qty),0) AS n FROM order_items WHERE order_id = ?`, id)?.n ?? 0,
    ),
    customerName: String(row.customerName ?? ""),
    customerMobile: String(row.customerMobile ?? ""),
    email: (row.email as string | null) ?? null,
    address: {
      line1: String(row.line1 ?? ""),
      line2: (row.line2 as string | null) ?? null,
      city: String(row.city ?? ""),
      state: String(row.state ?? ""),
      pin: String(row.pin ?? ""),
      landmark: (row.landmark as string | null) ?? null,
    },
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    shipping: Number(row.shipping),
    codFee: Number(row.codFee),
    notes: (row.notes as string | null) ?? null,
    paymentReference: (row.paymentReference as string | null) ?? null,
    cancelledReason: (row.cancelledReason as string | null) ?? null,
    expectedDeliveryAt: (row.expectedDeliveryAt as string | null) ?? null,
    deliveredAt: (row.deliveredAt as string | null) ?? null,
    customerId: (row.customerId as number | null) ?? null,
    items: all<OrderDetail["items"][number] & { order_id: number }>(
      `SELECT oi.name, oi.size, oi.color, oi.unit_price AS unitPrice, oi.qty,
              oi.line_total AS lineTotal, oi.image, oi.sku, p.slug
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ? ORDER BY oi.id`,
      id,
    ),
    events: all<OrderDetail["events"][number]>(
      `SELECT status, note, actor_type AS actorType, created_at AS createdAt
         FROM order_events WHERE order_id = ? ORDER BY id ASC`,
      id,
    ),
  };
}

/** Public tracking: the random `public_ref` is the capability, so no login. */
export function getOrderByRef(ref: string): OrderDetail | null {
  const row = get<Record<string, unknown>>(`${FULL_ORDER_SELECT} WHERE o.public_ref = ? COLLATE NOCASE`, ref.trim());
  return row ? buildOrderDetail(row) : null;
}

export function getOrderByPublicId(id: number): OrderDetail | null {
  const row = get<Record<string, unknown>>(`${FULL_ORDER_SELECT} WHERE o.id = ?`, id);
  return row ? buildOrderDetail(row) : null;
}

export function listRecentOrdersForMobile(mobile: string, limit = 5) {
  return all<OrderSummary>(
    `${ORDER_SELECT} WHERE REPLACE(o.guest_mobile,' ','') = ? ORDER BY o.placed_at DESC LIMIT ?`,
    mobile,
    limit,
  );
}

export function listOrdersForCustomer(customerId: number, limit = 30) {
  return all<OrderSummary>(
    `${ORDER_SELECT} WHERE o.customer_id = ? ORDER BY o.placed_at DESC, o.id DESC LIMIT ?`,
    customerId,
    limit,
  );
}

export function openOrderSummaryForCustomer(customerId: number) {
  return get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM orders
      WHERE customer_id = ? AND status IN ('placed','confirmed','processing','packed','shipped','out_for_delivery')`,
    customerId,
  )?.n ?? 0;
}

// -------------------------------------------------------------- dashboard stats
export function dashboardStats() {
  const totals =
    get<{
      orders: number;
      revenue: number;
      pending: number;
      delivered: number;
      cancelled: number;
      aov: number;
      todayOrders: number;
      todayRevenue: number;
      units: number;
    }>(
      `SELECT
         COUNT(*) AS orders,
         COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total END),0) AS revenue,
         COALESCE(SUM(CASE WHEN status IN ('placed','confirmed','processing','packed') THEN 1 END),0) AS pending,
         COALESCE(SUM(CASE WHEN status = 'delivered' THEN 1 END),0) AS delivered,
         COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 END),0) AS cancelled,
         COALESCE(ROUND(AVG(CASE WHEN status <> 'cancelled' THEN total END),0),0) AS aov,
         COALESCE(SUM(CASE WHEN date(placed_at) = date('now') THEN 1 END),0) AS todayOrders,
         COALESCE(SUM(CASE WHEN date(placed_at) = date('now') AND status <> 'cancelled' THEN total END),0) AS todayRevenue,
         COALESCE(SUM((SELECT SUM(qty) FROM order_items oi WHERE oi.order_id = orders.id)),0) AS units
       FROM orders`,
    ) ?? EMPTY_STATS;

  const catalogue =
    get<{ products: number; published: number; hidden: number; low: number; out: number; stockValue: number }>(
      `SELECT COUNT(*) AS products,
              COALESCE(SUM(CASE WHEN status='published' THEN 1 END),0) AS published,
              COALESCE(SUM(CASE WHEN status<>'published' THEN 1 END),0) AS hidden,
              COALESCE(SUM(CASE WHEN COALESCE(av.stock,0) > 0 AND COALESCE(av.stock,0) <= p.low_stock_threshold THEN 1 END),0) AS low,
              COALESCE(SUM(CASE WHEN COALESCE(av.stock,0) = 0 THEN 1 END),0) AS out,
              COALESCE(SUM(COALESCE(av.stock,0) * p.price),0) AS stockValue
         FROM products p LEFT JOIN product_availability av ON av.product_id = p.id`,
    ) ?? EMPTY_STATS;

  const people =
    get<{ customers: number; newCustomers: number }>(
      `SELECT COUNT(*) AS customers,
              COALESCE(SUM(CASE WHEN created_at >= datetime('now','-30 days') THEN 1 END),0) AS newCustomers
         FROM customers`,
    ) ?? EMPTY_STATS;

  const series = all<{ day: string; revenue: number; orders: number }>(
    `SELECT date(placed_at) AS day,
            COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total END),0) AS revenue,
            COUNT(*) AS orders
       FROM orders WHERE placed_at >= date('now','-29 days')
      GROUP BY day ORDER BY day ASC`,
  );

  const byStatus = all<{ status: string; n: number }>(
    `SELECT status, COUNT(*) AS n FROM orders GROUP BY status ORDER BY n DESC`,
  );

  const topProducts = all<{ name: string; qty: number; revenue: number; slug: string | null }>(
    `SELECT oi.name, SUM(oi.qty) AS qty, SUM(oi.line_total) AS revenue, MAX(p.slug) AS slug
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id AND o.status <> 'cancelled'
       LEFT JOIN products p ON p.id = oi.product_id
      GROUP BY oi.name ORDER BY qty DESC LIMIT 6`,
  );

  const paymentSplit = all<{ method: string; n: number; value: number }>(
    `SELECT payment_method AS method, COUNT(*) AS n, COALESCE(SUM(total),0) AS value
       FROM orders WHERE status <> 'cancelled' GROUP BY payment_method`,
  );

  const recent = all<OrderSummary>(
    `${ORDER_SELECT} ORDER BY o.placed_at DESC, o.id DESC LIMIT 8`,
  );

  return { totals, catalogue, people, series, byStatus, topProducts, paymentSplit, recent };
}

export type DashboardStats = ReturnType<typeof dashboardStats>;
