import { all, get, insert, nowIso, run, tx } from "@/server/db";
import type { Settings } from "@/server/repositories/settings.repository";

export type CustomerRow = {
  id: number;
  name: string | null;
  mobile: string;
  email: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  orders: number;
  spent: number;
  lastOrderAt: string | null;
  openOrders: number;
};

/** Guest checkouts create (or reuse) an account by mobile — no password wall. */
export function upsertCustomerByMobile(input: {
  mobile: string;
  name: string;
  email?: string | null;
}) {
  const existing = get<{ id: number; name: string | null }>(
    `SELECT id, name FROM customers WHERE mobile = ?`,
    input.mobile,
  );
  if (existing) {
    run(
      `UPDATE customers SET
         name = COALESCE(NULLIF(?, ''), name),
         email = COALESCE(NULLIF(?, ''), email),
         last_login_at = ?
       WHERE id = ?`,
      input.name,
      input.email ?? "",
      nowIso(),
      existing.id,
    );
    return existing.id;
  }
  return insert(
    `INSERT INTO customers (mobile, name, email, created_at, last_login_at) VALUES (?,?,?,?,?)`,
    input.mobile,
    input.name,
    input.email ?? null,
    nowIso(),
    nowIso(),
  );
}

export function findCustomer(mobile: string) {
  return get<{
    id: number;
    name: string | null;
    mobile: string;
    email: string | null;
    password_hash: string | null;
    created_at: string;
  }>(`SELECT id, name, mobile, email, password_hash, created_at FROM customers WHERE mobile = ?`, mobile);
}

export function createCustomerWithPassword(input: {
  mobile: string;
  name: string;
  email?: string | null;
  passwordHash: string;
}) {
  return insert(
    `INSERT INTO customers (mobile, name, email, password_hash, created_at, last_login_at)
     VALUES (?,?,?,?,?,?)`,
    input.mobile,
    input.name,
    input.email ?? null,
    input.passwordHash,
    nowIso(),
    nowIso(),
  );
}

export function updateProfile(customerId: number, patch: { name?: string; email?: string | null }) {
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  if (patch.name !== undefined) {
    sets.push("name = ?");
    params.push(patch.name);
  }
  if (patch.email !== undefined) {
    sets.push("email = ?");
    params.push(patch.email || null);
  }
  if (!sets.length) return 0;
  return run(`UPDATE customers SET ${sets.join(", ")} WHERE id = ?`, ...params, customerId).changes;
}

export function customerProfile(customerId: number) {
  const row = get<{ id: number; name: string | null; mobile: string; email: string | null; createdAt: string }>(
    `SELECT id, name, mobile, email, created_at AS createdAt FROM customers WHERE id = ?`,
    customerId,
  );
  if (!row) return null;
  const stats = get<{ orders: number; spent: number; open: number; last: string | null }>(
    `SELECT COUNT(*) AS orders,
            COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total END),0) AS spent,
            COALESCE(SUM(CASE WHEN status IN ('placed','confirmed','processing','packed','shipped','out_for_delivery') THEN 1 END),0) AS open,
            MAX(placed_at) AS last
       FROM orders WHERE customer_id = ? OR (customer_id IS NULL AND guest_mobile = ?)`,
    customerId,
    row.mobile,
  );
  return {
    ...row,
    orders: stats?.orders ?? 0,
    spent: stats?.spent ?? 0,
    open: stats?.open ?? 0,
    lastOrderAt: stats?.last ?? null,
    addresses: listAddresses(customerId),
  };
}

// ---------------------------------------------------------------------- addresses
export type AddressRow = {
  id: number;
  label: string | null;
  recipient: string | null;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pin: string;
  landmark: string | null;
  isDefault: number;
};

export function listAddresses(customerId: number): AddressRow[] {
  return all<AddressRow>(
    `SELECT id, label, recipient, phone, line1, line2, city, state, pin, landmark,
            is_default AS isDefault
       FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, id DESC`,
    customerId,
  );
}

export function saveAddress(customerId: number, input: Record<string, unknown>, id?: number) {
  const fields = {
    label: (input.label as string) || "Home",
    recipient: (input.recipient as string) || "",
    phone: (input.phone as string) || "",
    line1: input.line1 as string,
    line2: (input.line2 as string) || null,
    city: input.city as string,
    state: input.state as string,
    pin: input.pin as string,
    landmark: (input.landmark as string) || null,
  };

  return tx(() => {
    if (input.isDefault) run(`UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?`, customerId);
    if (id) {
      run(
        `UPDATE customer_addresses SET label=?, recipient=?, phone=?, line1=?, line2=?, city=?, state=?, pin=?, landmark=?, is_default=?
          WHERE id = ? AND customer_id = ?`,
        fields.label,
        fields.recipient,
        fields.phone,
        fields.line1,
        fields.line2,
        fields.city,
        fields.state,
        fields.pin,
        fields.landmark,
        input.isDefault ? 1 : 0,
        id,
        customerId,
      );
      return id;
    }
    const isFirst =
      (get<{ n: number }>(`SELECT COUNT(*) AS n FROM customer_addresses WHERE customer_id = ?`, customerId)?.n ?? 0) === 0;
    return insert(
      `INSERT INTO customer_addresses
        (customer_id, label, recipient, phone, line1, line2, city, state, pin, landmark, is_default)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      customerId,
      fields.label,
      fields.recipient,
      fields.phone,
      fields.line1,
      fields.line2,
      fields.city,
      fields.state,
      fields.pin,
      fields.landmark,
      isFirst || input.isDefault ? 1 : 0,
    );
  });
}

export function deleteAddress(customerId: number, id: number) {
  return run(`DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?`, id, customerId).changes;
}

// ------------------------------------------------------------------ admin views
export function listCustomers(filter: { q?: string; sort?: "recent" | "spenders" | "newest"; page?: number; perPage?: number } = {}) {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (filter.q?.trim()) {
    const like = `%${filter.q.trim().replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    clauses.push(`(c.name LIKE ? ESCAPE '\\' OR c.mobile LIKE ? ESCAPE '\\' OR COALESCE(c.email,'') LIKE ? ESCAPE '\\')`);
    params.push(like, like, like);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const perPage = filter.perPage ?? 20;
  const page = Math.max(1, filter.page ?? 1);
  const sortSql =
    filter.sort === "spenders"
      ? "spent DESC"
      : filter.sort === "recent"
        ? "lastOrderAt DESC"
        : "c.created_at DESC";

  const rows = all<CustomerRow>(
    `SELECT c.id, c.name, c.mobile, c.email,
            c.created_at AS createdAt, c.last_login_at AS lastLoginAt,
            (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id OR (o.customer_id IS NULL AND o.guest_mobile = c.mobile)) AS orders,
            (SELECT COALESCE(SUM(o.total),0) FROM orders o WHERE (o.customer_id = c.id OR (o.customer_id IS NULL AND o.guest_mobile = c.mobile)) AND o.status <> 'cancelled') AS spent,
            (SELECT MAX(o.placed_at) FROM orders o WHERE o.customer_id = c.id OR (o.customer_id IS NULL AND o.guest_mobile = c.mobile)) AS lastOrderAt,
            (SELECT COUNT(*) FROM orders o WHERE (o.customer_id = c.id OR (o.customer_id IS NULL AND o.guest_mobile = c.mobile)) AND o.status IN ('placed','confirmed','processing','packed','shipped','out_for_delivery')) AS openOrders
       FROM customers c ${where}
      ORDER BY ${sortSql} LIMIT ? OFFSET ?`,
    ...params,
    perPage,
    (page - 1) * perPage,
  );

  const total = get<{ n: number }>(`SELECT COUNT(*) AS n FROM customers c ${where}`, ...params)?.n ?? 0;
  return { items: rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export function customerDetail(id: number) {
  const customer = get<{
    id: number;
    name: string | null;
    mobile: string;
    email: string | null;
    createdAt: string;
    lastLoginAt: string | null;
  }>(
    `SELECT id, name, mobile, email, created_at AS createdAt, last_login_at AS lastLoginAt
       FROM customers WHERE id = ?`,
    id,
  );
  if (!customer) return null;
  const orders = all<{
    id: number;
    publicRef: string;
    placedAt: string;
    status: string;
    total: number;
    paymentMethod: string;
    paymentStatus: string;
    city: string;
    units: number;
    preview: string;
  }>(
    `SELECT o.id, o.public_ref AS publicRef, o.placed_at AS placedAt, o.status, o.total,
            o.payment_method AS paymentMethod, o.payment_status AS paymentStatus, o.city,
            (SELECT COALESCE(SUM(qty),0) FROM order_items oi WHERE oi.order_id = o.id) AS units,
            (SELECT GROUP_CONCAT(name, ' · ') FROM (SELECT name FROM order_items WHERE order_id = o.id LIMIT 3)) AS preview
       FROM orders o
      WHERE o.customer_id = ? OR (o.customer_id IS NULL AND o.guest_mobile = ?)
      ORDER BY o.placed_at DESC LIMIT 40`,
    id,
    customer.mobile,
  );
  return {
    ...customer,
    orders,
    stats: {
      orders: orders.length,
      spent: orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + o.total, 0),
      lastOrderAt: orders[0]?.placedAt ?? null,
    },
    addresses: listAddresses(id),
  };
}

/** Used when an admin edits the shop details so the profile stays in sync. */
export function shopContactDefaults(settings: Settings) {
  return { city: settings.city, state: settings.state, pin: settings.pin };
}
