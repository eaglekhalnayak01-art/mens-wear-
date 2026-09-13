/**
 * Catalogue writes (admin). All of it runs inside one transaction, so a product
 * can never be saved with half a variant list or a missing image row.
 */
import { all, get, insert, nowIso, run, tx } from "@/server/db";
import { slugify } from "@/lib/format";
import { PRODUCT_JOIN, SELECT_FIELDS, groupByProduct, toCard, type RawProduct } from "@/server/repositories/products.repository";
import type { ProductCard } from "@/server/repositories/types";

const SIZE_ORDER = ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "Free", "Onesize"];

function sizeSort(label: string) {
  const idx = SIZE_ORDER.findIndex((s) => s.toLowerCase() === label.toLowerCase());
  if (idx >= 0) return idx;
  const n = Number(label.replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? 200 + n : 900;
}

export function ensureSize(label: string): number {
  const clean = label.trim().slice(0, 12);
  const existing = get<{ id: number }>(`SELECT id FROM sizes WHERE lower(label) = lower(?)`, clean);
  if (existing) return existing.id;
  const id = insert(`INSERT INTO sizes (label, sort) VALUES (?,?)`, clean, sizeSort(clean));
  return id;
}

export function ensureColor(name: string, hex: string): number {
  const clean = name.trim().slice(0, 24);
  const existing = get<{ id: number }>(`SELECT id FROM colors WHERE lower(name) = lower(?)`, clean);
  if (existing) {
    run(`UPDATE colors SET hex = ? WHERE id = ? AND hex IS NULL`, hex, existing.id);
    return existing.id;
  }
  return insert(`INSERT INTO colors (name, hex) VALUES (?,?)`, clean, hex.toLowerCase());
}

export function uniqueSlug(base: string, ignoreId?: number) {
  const root = slugify(base) || "product";
  let candidate = root;
  let n = 2;
  // Slug collisions are possible when two products share a name; keep it readable.
  while (
    get<{ id: number }>(
      `SELECT id FROM products WHERE slug = ?${ignoreId ? " AND id <> ?" : ""}`,
      ...(ignoreId ? [candidate, ignoreId] : [candidate]),
    )
  ) {
    candidate = `${root}-${n++}`;
    if (n > 50) {
      candidate = `${root}-${Date.now().toString(36)}`;
      break;
    }
  }
  return candidate;
}

export function uniqueSku(base: string, productId: number) {
  const root = (base.trim().toUpperCase() || `AMW-${productId}`).slice(0, 28);
  let candidate = root;
  let n = 2;
  while (get<{ id: number }>(`SELECT id FROM products WHERE sku = ? AND id <> ?`, candidate, productId)) {
    candidate = `${root}-${n++}`;
  }
  return candidate;
}

export type ProductInput = {
  name: string;
  slug?: string;
  categoryId?: number | null;
  subCategory?: string;
  brand?: string;
  description?: string;
  fabric?: string;
  care?: string;
  price: number;
  compareAtPrice?: number | null;
  sku?: string;
  status: "published" | "hidden" | "draft";
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestseller: boolean;
  lowStockThreshold: number;
  sizes: string[];
  colors: { name: string; hex: string }[];
  variants: { size: string; color: string; stock: number }[];
  images: { src: string; alt?: string; isPrimary?: boolean }[];
};

function writeTaxonomy(productId: number, input: ProductInput) {
  const sizeIds = new Map<string, number>();
  const colorIds = new Map<string, number>();

  for (const label of input.sizes) sizeIds.set(label.trim(), ensureSize(label));
  for (const color of input.colors) colorIds.set(color.name.trim(), ensureColor(color.name, color.hex));

  // Make sure every variant's size/colour exists even if the owner typed a new one
  // straight into the stock grid.
  for (const v of input.variants) {
    if (v.size && !sizeIds.has(v.size.trim())) sizeIds.set(v.size.trim(), ensureSize(v.size));
    if (v.color && !colorIds.has(v.color.trim())) colorIds.set(v.color.trim(), ensureColor(v.color, "#7c7c7c"));
  }

  run(`DELETE FROM product_sizes WHERE product_id = ?`, productId);
  let sort = 0;
  for (const id of sizeIds.values()) {
    run(`INSERT INTO product_sizes (product_id, size_id, sort) VALUES (?,?,?)`, productId, id, sort++);
  }

  run(`DELETE FROM product_colors WHERE product_id = ?`, productId);
  sort = 0;
  for (const id of colorIds.values()) {
    run(`INSERT INTO product_colors (product_id, color_id, sort) VALUES (?,?,?)`, productId, id, sort++);
  }

  return { sizeIds, colorIds };
}

function writeVariants(productId: number, input: ProductInput, maps: { sizeIds: Map<string, number>; colorIds: Map<string, number> }) {
  const existing = all<{ id: number; size: string | null; color: string | null }>(
    `SELECT v.id, s.label AS size, c.name AS color
       FROM product_variants v
       LEFT JOIN sizes s ON s.id = v.size_id
       LEFT JOIN colors c ON c.id = v.color_id
      WHERE v.product_id = ?`,
    productId,
  );
  const keyOf = (size?: string | null, color?: string | null) => `${(size ?? "").toLowerCase()}|${(color ?? "").toLowerCase()}`;
  const byKey = new Map(existing.map((row) => [keyOf(row.size, row.color), row.id]));
  const keep = new Set<number>();

  for (const v of input.variants) {
    const sizeId = v.size ? maps.sizeIds.get(v.size.trim()) ?? null : null;
    const colorId = v.color ? maps.colorIds.get(v.color.trim()) ?? null : null;
    if (v.size && !sizeId) continue;
    if (v.color && !colorId) continue;
    const key = keyOf(v.size, v.color);
    const matchId = byKey.get(key);
    if (matchId) {
      run(`UPDATE product_variants SET stock = ?, is_active = 1, size_id = ?, color_id = ? WHERE id = ?`, v.stock, sizeId, colorId, matchId);
      keep.add(matchId);
    } else {
      const id = insert(
        `INSERT INTO product_variants (product_id, size_id, color_id, stock, sku) VALUES (?,?,?,?,?)`,
        productId,
        sizeId,
        colorId,
        v.stock,
        null,
      );
      run(`UPDATE product_variants SET sku = ? WHERE id = ?`, `AMW-${productId}-${id}`, id);
      keep.add(id);
    }
  }

  // Drop variants the owner removed, but never break order history (SET NULL).
  for (const row of existing) {
    if (!keep.has(row.id)) run(`DELETE FROM product_variants WHERE id = ?`, row.id);
  }

  // A product with no grid rows still needs one buyable variant.
  if (keep.size === 0) {
    const sizeId = maps.sizeIds.size ? [...maps.sizeIds.values()][0] : null;
    const colorId = maps.colorIds.size ? [...maps.colorIds.values()][0] : null;
    const id = insert(
      `INSERT INTO product_variants (product_id, size_id, color_id, stock, sku) VALUES (?,?,?,?,?)`,
      productId,
      sizeId,
      colorId,
      Math.max(1, input.variants.reduce((a, b) => a + b.stock, 0)),
      null,
    );
    run(`UPDATE product_variants SET sku = ? WHERE id = ?`, `AMW-${productId}-${id}`, id);
  }
}

function writeImages(productId: number, images: ProductInput["images"]) {
  run(`DELETE FROM product_images WHERE product_id = ?`, productId);
  const chosen = images.filter((img) => img.src);
  const primaryIdx = Math.max(0, chosen.findIndex((img) => img.isPrimary));
  chosen.forEach((img, index) => {
    run(
      `INSERT INTO product_images (product_id, src, alt, sort, is_primary) VALUES (?,?,?,?,?)`,
      productId,
      img.src.slice(0, 400),
      (img.alt ?? "").slice(0, 160) || null,
      index,
      index === primaryIdx ? 1 : 0,
    );
  });
}

export function createProduct(input: ProductInput) {
  return tx(() => {
    const slug = uniqueSlug(input.slug || input.name);
    const id = insert(
      `INSERT INTO products
        (name, slug, category_id, sub_category, brand, description, fabric, care,
         price, compare_at_price, sku, status, is_featured, is_new_arrival, is_bestseller,
         low_stock_threshold, created_at, updated_at, published_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      input.name.trim(),
      slug,
      input.categoryId ?? null,
      input.subCategory || null,
      input.brand || null,
      input.description || null,
      input.fabric || null,
      input.care || null,
      input.price,
      input.compareAtPrice ?? null,
      input.sku?.trim() || `AMW-${slug.slice(0, 10).toUpperCase()}`,
      input.status,
      input.isFeatured ? 1 : 0,
      input.isNewArrival ? 1 : 0,
      input.isBestseller ? 1 : 0,
      input.lowStockThreshold,
      nowIso(),
      nowIso(),
      input.status === "published" ? nowIso() : null,
    );

    const sku = uniqueSku(input.sku || `AMW-${id}`, id);
    run(`UPDATE products SET sku = ? WHERE id = ?`, sku, id);

    const maps = writeTaxonomy(id, input);
    writeVariants(id, input, maps);
    writeImages(id, input.images);
    return id;
  });
}

export function updateProduct(id: number, input: ProductInput) {
  return tx(() => {
    const exists = get<{ id: number; status: string }>(`SELECT id, status FROM products WHERE id = ?`, id);
    if (!exists) return null;

    run(
      `UPDATE products SET
         name = ?, slug = ?, category_id = ?, sub_category = ?, brand = ?, description = ?,
         fabric = ?, care = ?, price = ?, compare_at_price = ?, sku = ?, status = ?,
         is_featured = ?, is_new_arrival = ?, is_bestseller = ?, low_stock_threshold = ?,
         published_at = COALESCE(published_at, CASE WHEN ? = 'published' THEN ? ELSE NULL END),
         updated_at = ?
       WHERE id = ?`,
      input.name.trim(),
      uniqueSlug(input.slug || input.name, id),
      input.categoryId ?? null,
      input.subCategory || null,
      input.brand || null,
      input.description || null,
      input.fabric || null,
      input.care || null,
      input.price,
      input.compareAtPrice ?? null,
      input.sku?.trim() || null,
      input.status,
      input.isFeatured ? 1 : 0,
      input.isNewArrival ? 1 : 0,
      input.isBestseller ? 1 : 0,
      input.lowStockThreshold,
      input.status,
      nowIso(),
      nowIso(),
      id,
    );

    const maps = writeTaxonomy(id, input);
    writeVariants(id, input, maps);
    if (input.images) writeImages(id, input.images);
    return id;
  });
}

export function deleteProduct(id: number) {
  return tx(() => {
    const used = get<{ n: number }>(`SELECT COUNT(*) AS n FROM order_items WHERE product_id = ?`, id);
    if ((used?.n ?? 0) > 0) {
      // Keep the audit trail: hide it instead of destroying sales history.
      run(`UPDATE products SET status = 'hidden', updated_at = ? WHERE id = ?`, nowIso(), id);
      return { hidden: true as const };
    }
    run(`DELETE FROM products WHERE id = ?`, id);
    return { deleted: true as const };
  });
}

export function patchProduct(id: number, patch: Record<string, unknown>) {
  const allowed: Record<string, string> = {
    price: "price",
    compareAtPrice: "compare_at_price",
    status: "status",
    isFeatured: "is_featured",
    isNewArrival: "is_new_arrival",
    isBestseller: "is_bestseller",
    lowStockThreshold: "low_stock_threshold",
    stock: "stock",
  };
  const sets: string[] = [];
  const params: (string | number)[] = [];
  for (const [key, column] of Object.entries(allowed)) {
    if (!(key in patch) || column === "stock") continue;
    const value = patch[key];
    sets.push(`${column} = ?`);
    params.push(typeof value === "boolean" ? (value ? 1 : 0) : (value as string | number));
  }
  if (!sets.length) return { updated: 0 };
  const res = run(`UPDATE products SET ${sets.join(", ")}, updated_at = ? WHERE id = ?`, ...params, nowIso(), id);
  return { updated: res.changes };
}

export function setVariantStock(variantId: number, stock: number, reason: string, note?: string) {
  return tx(() => {
    const variant = get<{ id: number; product_id: number; stock: number }>(
      `SELECT id, product_id, stock FROM product_variants WHERE id = ?`,
      variantId,
    );
    if (!variant) return null;
    const delta = stock - variant.stock;
    run(`UPDATE product_variants SET stock = ? WHERE id = ?`, stock, variantId);
    run(`UPDATE products SET updated_at = ? WHERE id = ?`, nowIso(), variant.product_id);
    run(
      `INSERT INTO stock_movements (product_id, variant_id, delta, reason, note, created_at) VALUES (?,?,?,?,?,?)`,
      variant.product_id,
      variantId,
      delta,
      reason,
      note ?? null,
      nowIso(),
    );
    return { delta, productId: variant.product_id };
  });
}

export function adjustProductStock(productId: number, delta: number, note?: string) {
  return tx(() => {
    const variants = all<{ id: number }>(`SELECT id FROM product_variants WHERE product_id = ? AND is_active = 1`, productId);
    if (!variants.length) return { touched: 0 };
    // Spread the change evenly; the last variant absorbs the remainder so the
    // product total moves by exactly what the owner typed.
    const per = Math.trunc(delta / variants.length);
    let applied = 0;
    variants.forEach((v, i) => {
      const amount = i === variants.length - 1 ? delta - applied : per;
      applied += amount;
      run(
        `UPDATE product_variants SET stock = MAX(0, stock + ?) WHERE id = ?`,
        amount,
        v.id,
      );
      run(
        `INSERT INTO stock_movements (product_id, variant_id, delta, reason, note, created_at) VALUES (?,?,?,?,?,?)`,
        productId,
        v.id,
        amount,
        delta >= 0 ? "restock" : "adjustment",
        note ?? null,
        nowIso(),
      );
    });
    run(`UPDATE products SET updated_at = ? WHERE id = ?`, nowIso(), productId);
    return { touched: variants.length };
  });
}

export function reorderImages(productId: number, order: { src: string; alt?: string }[], primarySrc?: string) {
  return tx(() => {
    run(`DELETE FROM product_images WHERE product_id = ?`, productId);
    order.forEach((img, index) => {
      run(
        `INSERT INTO product_images (product_id, src, alt, sort, is_primary) VALUES (?,?,?,?,?)`,
        productId,
        img.src.slice(0, 400),
        (img.alt ?? "").slice(0, 160) || null,
        index,
        primarySrc ? (img.src === primarySrc ? 1 : 0) : index === 0 ? 1 : 0,
      );
    });
    run(`UPDATE products SET updated_at = ? WHERE id = ?`, nowIso(), productId);
    return { count: order.length };
  });
}

export function toggleImageAlt(productId: number, imageId: number, alt: string) {
  const res = run(`UPDATE product_images SET alt = ? WHERE id = ? AND product_id = ?`, alt.slice(0, 160) || null, imageId, productId);
  return { updated: res.changes };
}

export type AdminProductFilter = {
  q?: string;
  status?: "all" | "published" | "hidden" | "draft";
  categoryId?: number;
  flag?: "all" | "new" | "bestseller" | "featured" | "sale";
  stock?: "all" | "low" | "out" | "in";
  sort?: "newest" | "oldest" | "name_az" | "stock_low" | "price_high" | "price_low";
  page?: number;
  perPage?: number;
};

const ADMIN_SORTS: Record<string, string> = {
  newest: "p.created_at DESC",
  oldest: "p.created_at ASC",
  name_az: "p.name ASC",
  stock_low: "COALESCE(av.stock,0) ASC",
  price_high: "p.price DESC",
  price_low: "p.price ASC",
};

export function listAdminProducts(filter: AdminProductFilter) {
  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (filter.q?.trim()) {
    const like = `%${filter.q.trim().replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    clauses.push(`(p.name LIKE ? ESCAPE '\\' OR COALESCE(p.sku,'') LIKE ? ESCAPE '\\' OR COALESCE(p.brand,'') LIKE ? ESCAPE '\\')`);
    params.push(like, like, like);
  }
  if (filter.status && filter.status !== "all") {
    clauses.push("p.status = ?");
    params.push(filter.status);
  }
  if (filter.categoryId) {
    clauses.push("p.category_id = ?");
    params.push(filter.categoryId);
  }
  if (filter.flag === "new") clauses.push("p.is_new_arrival = 1");
  if (filter.flag === "bestseller") clauses.push("p.is_bestseller = 1");
  if (filter.flag === "featured") clauses.push("p.is_featured = 1");
  if (filter.flag === "sale") clauses.push("p.compare_at_price > p.price");
  if (filter.stock === "in") clauses.push("COALESCE(av.stock,0) > p.low_stock_threshold");
  if (filter.stock === "low") clauses.push("COALESCE(av.stock,0) > 0 AND COALESCE(av.stock,0) <= p.low_stock_threshold");
  if (filter.stock === "out") clauses.push("COALESCE(av.stock,0) = 0");

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const perPage = filter.perPage ?? 20;
  const page = Math.max(1, filter.page ?? 1);
  const join = PRODUCT_JOIN;

  const total = get<{ n: number }>(`SELECT COUNT(*) AS n ${join} ${where}`, ...params)?.n ?? 0;
  const rows = all<RawProduct & { outVariants: number; imageCount: number }>(
    `${SELECT_FIELDS}, COALESCE(av.out_variants,0) AS outVariants,
            (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) AS imageCount
       ${join} ${where} ORDER BY ${ADMIN_SORTS[filter.sort ?? "newest"] ?? ADMIN_SORTS.newest} LIMIT ? OFFSET ?`,
    ...params,
    perPage,
    (page - 1) * perPage,
  );

  const enriched = groupByProduct(rows);
  const items = rows.map((row, i) => ({
    ...toCard(row, enriched[i]),
    status: row.status,
    sku: row.sku,
    description: row.description,
    fabric: row.fabric,
    care: row.care,
    soldQty: row.soldQty,
    lowStockThreshold: row.lowStockThreshold,
    outOfStockCount: row.outVariants ?? 0,
    imageCount: row.imageCount ?? 0,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
    variants: enriched[i].variants,
  }));

  return { items, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export function getAdminProduct(id: number) {
  const row = get<RawProduct>(`${SELECT_FIELDS} ${PRODUCT_JOIN} WHERE p.id = ?`, id);
  if (!row) return null;
  const [extra] = groupByProduct([row]);
  const card = toCard(row, extra);
  return {
    ...card,
    status: row.status,
    description: row.description,
    fabric: row.fabric,
    care: row.care,
    sku: row.sku,
    soldQty: row.soldQty,
    lowStockThreshold: row.lowStockThreshold,
    gallery: extra.images,
    variants: extra.variants,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Shop-floor view: which sizes of which colours actually have cloth on the shelf. */
export function stockGrid(productId: number) {
  return all<{ size: string | null; color: string | null; hex: string | null; stock: number; variantId: number; sku: string | null }>(
    `SELECT s.label AS size, c.name AS color, c.hex, v.stock, v.id AS variantId, v.sku
       FROM product_variants v
       LEFT JOIN sizes s ON s.id = v.size_id
       LEFT JOIN colors c ON c.id = v.color_id
      WHERE v.product_id = ? AND v.is_active = 1
      ORDER BY COALESCE(s.sort, 999), c.name`,
    productId,
  );
}
