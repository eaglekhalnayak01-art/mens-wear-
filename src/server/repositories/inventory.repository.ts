/** Stock levels, warnings and the movement ledger behind the inventory screen. */
import { all, get } from "@/server/db";

export type InventoryRow = {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  category: string | null;
  price: number;
  stock: number;
  sold: number;
  lowStockThreshold: number;
  status: string;
  image: string | null;
  variants: { variantId: number; size: string | null; color: string | null; stock: number; sku: string | null }[];
  state: "out" | "low" | "ok";
};

export function listInventory(
  filter: { q?: string; state?: "all" | "low" | "out" | "ok" | "hidden"; page?: number; perPage?: number } = {},
) {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (filter.q?.trim()) {
    const like = `%${filter.q.trim().replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    clauses.push(`(p.name LIKE ? ESCAPE '\\' OR COALESCE(p.sku,'') LIKE ? ESCAPE '\\')`);
    params.push(like, like);
  }
  if (filter.state === "low") clauses.push("COALESCE(av.stock,0) > 0 AND COALESCE(av.stock,0) <= p.low_stock_threshold");
  if (filter.state === "out") clauses.push("COALESCE(av.stock,0) = 0");
  if (filter.state === "ok") clauses.push("COALESCE(av.stock,0) > p.low_stock_threshold");
  if (filter.state === "hidden") clauses.push("p.status <> 'published'");

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const perPage = filter.perPage ?? 25;
  const page = Math.max(1, filter.page ?? 1);

  const total = get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM products p LEFT JOIN product_availability av ON av.product_id = p.id ${where}`,
    ...params,
  )?.n ?? 0;

  const rows = all<Omit<InventoryRow, "variants" | "state">>(
    `SELECT p.id, p.name, p.slug, p.sku, p.price, p.sold_qty AS sold,
            p.low_stock_threshold AS lowStockThreshold, p.status,
            COALESCE(av.stock,0) AS stock, c.name AS category,
            (SELECT src FROM product_images pi WHERE pi.product_id = p.id
              ORDER BY pi.is_primary DESC, pi.sort LIMIT 1) AS image
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN product_availability av ON av.product_id = p.id
       ${where}
      ORDER BY COALESCE(av.stock,0) ASC, p.name ASC
      LIMIT ? OFFSET ?`,
    ...params,
    perPage,
    (page - 1) * perPage,
  );

  const items: InventoryRow[] = rows.map((row) => ({
    ...row,
    variants: all<InventoryRow["variants"][number]>(
      `SELECT v.id AS variantId, s.label AS size, c.name AS color, v.stock, v.sku
         FROM product_variants v
         LEFT JOIN sizes s ON s.id = v.size_id
         LEFT JOIN colors c ON c.id = v.color_id
        WHERE v.product_id = ? AND v.is_active = 1
        ORDER BY COALESCE(s.sort,999), c.name`,
      row.id,
    ),
    state: row.stock === 0 ? "out" : row.stock <= row.lowStockThreshold ? "low" : "ok",
  }));

  return { items, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export function inventoryAlerts() {
  const row = get<{ low: number; out: number; value: number; units: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN COALESCE(av.stock,0) > 0 AND COALESCE(av.stock,0) <= p.low_stock_threshold THEN 1 END),0) AS low,
       COALESCE(SUM(CASE WHEN COALESCE(av.stock,0) = 0 THEN 1 END),0) AS out,
       COALESCE(SUM(COALESCE(av.stock,0) * p.price),0) AS value,
       COALESCE(SUM(COALESCE(av.stock,0)),0) AS units
     FROM products p
     LEFT JOIN product_availability av ON av.product_id = p.id
    WHERE p.status = 'published'`,
  );
  const worst = all<{ name: string; slug: string; stock: number; threshold: number; label: string }>(
    `SELECT p.name, p.slug, COALESCE(av.stock,0) AS stock, p.low_stock_threshold AS threshold,
            CASE WHEN COALESCE(av.stock,0) = 0 THEN 'out' ELSE 'low' END AS label
       FROM products p
       LEFT JOIN product_availability av ON av.product_id = p.id
      WHERE p.status = 'published' AND COALESCE(av.stock,0) <= p.low_stock_threshold
      ORDER BY COALESCE(av.stock,0) ASC, p.name ASC LIMIT 6`,
  );
  return { low: row?.low ?? 0, out: row?.out ?? 0, value: row?.value ?? 0, units: row?.units ?? 0, worst };
}

export function stockMovements(productId?: number, limit = 40) {
  return all<{
    id: number;
    productName: string | null;
    size: string | null;
    color: string | null;
    delta: number;
    reason: string;
    note: string | null;
    createdAt: string;
    orderRef: string | null;
  }>(
    `SELECT m.id, p.name AS productName, s.label AS size, c.name AS color,
            m.delta, m.reason, m.note, m.created_at AS createdAt, o.public_ref AS orderRef
       FROM stock_movements m
       JOIN products p ON p.id = m.product_id
       LEFT JOIN product_variants v ON v.id = m.variant_id
       LEFT JOIN sizes s ON s.id = v.size_id
       LEFT JOIN colors c ON c.id = v.color_id
       LEFT JOIN orders o ON o.id = m.order_id
      ${productId ? "WHERE m.product_id = ?" : ""}
      ORDER BY m.id DESC LIMIT ?`,
    ...(productId ? [productId] : []),
    limit,
  );
}
