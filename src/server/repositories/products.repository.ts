/**
 * Catalogue reads. One place that knows SQL for products; everything else
 * (pages, APIs, services) calls these functions. Only prepared statements are
 * used — sort directions and filter keys are whitelisted, never interpolated.
 */
import { all, get, likeParams, inClause } from "@/server/db";
import { discountPercent } from "@/lib/format";
import type { ColorRef, Facets, ImageRef, ProductCard, ProductDetail, ProductVariant } from "@/server/repositories/types";
import type { ShopQuery } from "@/server/validation/schemas";

/** What the shop filters accept (all optional; defaults applied in queries.ts). */
export type ShopQueryInput = Partial<Omit<ShopQuery, "page" | "perPage" | "sort" | "availability">> &
  Pick<Partial<ShopQuery>, "page" | "perPage" | "sort" | "availability">;

const STOREFRONT_STATUS = "published";

type FilterDim = "q" | "category" | "collection" | "sizes" | "colors" | "price" | "availability";

type WhereOpts = {
  q: Partial<ShopQuery>;
  status?: string;
  skip?: FilterDim[];
};

function list(value?: string) {
  return (value ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function buildWhere({ q, status = STOREFRONT_STATUS, skip = [] }: WhereOpts) {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  const has = (d: FilterDim) => !skip.includes(d);

  if (status !== "any") {
    clauses.push("p.status = ?");
    params.push(status);
  }

  if (has("q") && q.q?.trim()) {
    const words = likeParams(q.q);
    for (const _w of words) {
      clauses.push(
        `(p.name LIKE ? ESCAPE '\\' OR COALESCE(p.brand,'') LIKE ? ESCAPE '\\'
          OR COALESCE(p.sku,'') LIKE ? ESCAPE '\\' OR COALESCE(p.sub_category,'') LIKE ? ESCAPE '\\'
          OR COALESCE(c.name,'') LIKE ? ESCAPE '\\')`,
      );
      const like = `%${_w}%`;
      params.push(like, like, like, like, like);
    }
  }

  if (has("category") && q.category) {
    clauses.push("(c.slug = ? OR EXISTS (SELECT 1 FROM categories ch WHERE ch.parent_id = c.id AND ch.slug = ?))");
    params.push(q.category, q.category);
  }

  if (has("collection")) {
    if (q.collection === "new") clauses.push("p.is_new_arrival = 1");
    if (q.collection === "bestsellers") clauses.push("p.is_bestseller = 1");
    if (q.collection === "featured") clauses.push("p.is_featured = 1");
    if (q.collection === "sale") clauses.push("p.compare_at_price IS NOT NULL AND p.compare_at_price > p.price");
  }

  const sizeLabels = has("sizes") ? list(q.sizes) : [];
  if (sizeLabels.length) {
    clauses.push(
      `EXISTS (SELECT 1 FROM product_variants fv JOIN sizes fsz ON fsz.id = fv.size_id
                WHERE fv.product_id = p.id AND fv.is_active = 1 AND fv.stock > 0
                  AND fsz.label IN (${inClause(sizeLabels)}))`,
    );
    params.push(...sizeLabels);
  }

  const colorNames = has("colors") ? list(q.colors) : [];
  if (colorNames.length) {
    clauses.push(
      `EXISTS (SELECT 1 FROM product_variants fv JOIN colors fc ON fc.id = fv.color_id
                WHERE fv.product_id = p.id AND fv.is_active = 1 AND fv.stock > 0
                  AND fc.name IN (${inClause(colorNames)}))`,
    );
    params.push(...colorNames);
  }

  if (has("price")) {
    if (typeof q.min === "number") {
      clauses.push("p.price >= ?");
      params.push(q.min);
    }
    if (typeof q.max === "number") {
      clauses.push("p.price <= ?");
      params.push(q.max);
    }
  }

  if (has("availability") && q.availability && q.availability !== "all") {
    clauses.push(
      q.availability === "in_stock"
        ? "COALESCE(av.stock,0) > 0"
        : "(COALESCE(av.stock,0) > 0 AND COALESCE(av.stock,0) <= p.low_stock_threshold)",
    );
  }

  return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

const SORTS: Record<string, string> = {
  newest: "COALESCE(p.published_at, p.created_at) DESC, p.id DESC",
  popular: "p.sold_qty DESC, COALESCE(p.rating,0) DESC, p.id DESC",
  price_low: "p.price ASC, p.id ASC",
  price_high: "p.price DESC, p.id DESC",
  discount: "((p.compare_at_price - p.price) * 1.0 / NULLIF(p.compare_at_price,0)) DESC, p.id DESC",
  name_az: "p.name ASC",
  stock_low: "COALESCE(av.stock,0) ASC",
};

/** Field list only — every caller supplies its own FROM/JOIN so admin
 * queries can add columns without a second copy of the select. */
export const SELECT_FIELDS = `
  SELECT p.id, p.name, p.slug, p.brand, p.price, p.compare_at_price AS compareAtPrice,
         p.sub_category AS subCategory, p.description, p.fabric, p.care, p.sku,
         p.is_new_arrival AS isNewArrival, p.is_bestseller AS isBestseller, p.is_featured AS isFeatured,
         p.rating, p.rating_count AS ratingCount, p.low_stock_threshold AS lowStockThreshold,
         p.sold_qty AS soldQty, p.status, p.payment_mode AS paymentMode, p.delivery_days AS deliveryDays,
         p.created_at AS createdAt, p.updated_at AS updatedAt,
         p.category_id AS categoryId,
         COALESCE(av.stock,0) AS stock,
         (SELECT src FROM product_images pi WHERE pi.product_id = p.id
            ORDER BY pi.is_primary DESC, pi.sort ASC LIMIT 1) AS imageSrc,
         (SELECT alt FROM product_images pi WHERE pi.product_id = p.id
            ORDER BY pi.is_primary DESC, pi.sort ASC LIMIT 1) AS imageAlt,
         c.name AS categoryName, c.slug AS categorySlug`;

export const PRODUCT_JOIN = `
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN product_availability av ON av.product_id = p.id`;

export type RawProduct = {
  id: number;
  name: string;
  slug: string;
  brand: string | null;
  price: number;
  compareAtPrice: number | null;
  subCategory: string | null;
  description: string | null;
  fabric: string | null;
  care: string | null;
  sku: string | null;
  paymentMode?: string | null;
  deliveryDays?: number | null;
  isNewArrival: number;
  isBestseller: number;
  isFeatured: number;
  rating: number | null;
  ratingCount: number;
  lowStockThreshold: number;
  soldQty: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  categoryId: number | null;
  stock: number;
  imageSrc: string | null;
  imageAlt: string | null;
  categoryName: string | null;
  categorySlug: string | null;
};

/** Fallback artwork so a product without photography still renders as design. */
export function placeholderImage(seed: string) {
  return `/api/placeholder/${encodeURIComponent(seed)}.svg`;
}

function variantRows(ids: number[]) {
  if (!ids.length) return [];
  return all<{
    product_id: number;
    id: number;
    size: string | null;
    color: string | null;
    hex: string | null;
    stock: number;
    price: number | null;
    sku: string | null;
    sizeSort: number;
  }>(
    `SELECT v.product_id, v.id, v.price, v.sku, v.stock,
            s.label AS size, s.sort AS sizeSort, co.name AS color, co.hex
       FROM product_variants v
       LEFT JOIN sizes s ON s.id = v.size_id
       LEFT JOIN colors co ON co.id = v.color_id
      WHERE v.product_id IN (${inClause(ids)}) AND v.is_active = 1
      ORDER BY v.product_id, COALESCE(s.sort, 999), co.name`,
    ...ids,
  );
}

function imageRows(ids: number[]) {
  if (!ids.length) return [];
  return all<{ product_id: number; src: string; alt: string | null; is_primary: number; sort: number }>(
    `SELECT product_id, src, alt, is_primary, sort FROM product_images
      WHERE product_id IN (${inClause(ids)})
      ORDER BY product_id, is_primary DESC, sort ASC`,
    ...ids,
  );
}

type Enriched = {
  sizes: string[];
  inStockSizes: string[];
  colors: ColorRef[];
  images: ImageRef[];
  variants: ProductVariant[];
};

export function groupByProduct(rows: RawProduct[]): Enriched[] {
  const ids = rows.map((r) => r.id);
  const variants = variantRows(ids);
  const images = imageRows(ids);
  const vById = new Map<number, typeof variants>();
  const iById = new Map<number, typeof images>();

  for (const v of variants) {
    const arr = vById.get(v.product_id) ?? [];
    arr.push(v);
    vById.set(v.product_id, arr);
  }
  for (const img of images) {
    const arr = iById.get(img.product_id) ?? [];
    arr.push(img);
    iById.set(img.product_id, arr);
  }

  return rows.map((row) => {
    const vs = vById.get(row.id) ?? [];
    const is = iById.get(row.id) ?? [];
    const sizeSet = new Map<string, number>();
    const inStockSizeSet = new Map<string, number>();
    const colorMap = new Map<string, ColorRef>();
    for (const v of vs) {
      if (v.size) {
        sizeSet.set(v.size, (sizeSet.get(v.size) ?? 0) + 1);
        if (v.stock > 0) inStockSizeSet.set(v.size, 1);
      }
      if (v.color && !colorMap.has(v.color)) {
        colorMap.set(v.color, { name: v.color, hex: v.hex ?? "#8a8a8a" });
      }
    }
    const gallery: ImageRef[] = is.length
      ? is.map((i) => ({ src: i.src, alt: i.alt ?? row.name }))
      : [{ src: placeholderImage(row.slug), alt: `${row.name} by Mens Wear` }];

    return {
      sizes: [...sizeSet.keys()],
      inStockSizes: [...inStockSizeSet.keys()],
      colors: [...colorMap.values()],
      images: gallery,
      variants: vs.map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        colorHex: v.hex,
        sku: v.sku,
        stock: v.stock,
        price: v.price ?? row.price,
      })),
    };
  });
}

export function toCard(row: RawProduct, extra?: Enriched): ProductCard {
  const sizes = extra?.inStockSizes.length ? extra.inStockSizes : (extra?.sizes ?? []);
  const onSale = (row.compareAtPrice ?? 0) > row.price;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    brand: row.brand,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    discountPct: discountPercent(row.price, row.compareAtPrice),
    image: extra?.images?.[0] ?? { src: placeholderImage(row.slug), alt: row.name },
    hoverImage: extra?.images?.[1] ?? null,
    category: row.categoryName ? { name: row.categoryName, slug: row.categorySlug! } : null,
    subCategory: row.subCategory,
    sizes,
    colors: extra?.colors ?? [],
    stock: row.stock,
    inStock: row.stock > 0,
    paymentMode: row.paymentMode === "cod" || row.paymentMode === "online" ? row.paymentMode : "both",
    deliveryDays: typeof row.deliveryDays === "number" && row.deliveryDays > 0 ? row.deliveryDays : null,
    isNewArrival: !!row.isNewArrival,
    isBestseller: !!row.isBestseller,
    isFeatured: !!row.isFeatured,
    rating: row.rating,
    ratingCount: row.ratingCount,
    badge: row.isNewArrival ? "New" : onSale ? "Sale" : row.isBestseller ? "Bestseller" : null,
    quickAdd: (() => {
      const available = (extra?.variants ?? []).filter((v) => v.stock > 0);
      const pick = available.find((v) => v.size && (extra?.inStockSizes ?? []).includes(v.size)) ?? available[0];
      return pick ? { variantId: pick.id, size: pick.size, color: pick.color } : null;
    })(),
  };
}

export type ListResult = { items: ProductCard[]; total: number; page: number; perPage: number; facets: Facets };

/** Accepts a partial query — the caller in `queries.ts` owns the defaults. */
export function listProducts(query: Partial<ShopQuery>): ListResult {
  const where = buildWhere({ q: query });
  const sort = SORTS[query.sort ?? "newest"] ?? SORTS.newest;
  const perPage = query.perPage ?? 12;
  const page = Math.max(1, query.page ?? 1);
  const offset = (page - 1) * perPage;

  const join = PRODUCT_JOIN;

  const total = get<{ n: number }>(`SELECT COUNT(*) AS n ${join} ${where.sql}`, ...where.params)?.n ?? 0;

  const rows = all<RawProduct>(
    `${SELECT_FIELDS} ${join} ${where.sql} ORDER BY ${sort} LIMIT ? OFFSET ?`,
    ...where.params,
    perPage,
    offset,
  );

  const enriched = groupByProduct(rows);
  const items = rows.map((row, i) => toCard(row, enriched[i]));

  return { items, total, page, perPage, facets: buildFacets(query) };
}

/** Home-strip / collection helper without pagination noise. */
export function pickProducts(
  where: string,
  opts: { limit?: number; sort?: keyof typeof SORTS; params?: (string | number)[] } = {},
): ProductCard[] {
  const join = PRODUCT_JOIN;
  const sort = SORTS[opts.sort ?? "newest"];
  const rows = all<RawProduct>(
    `${SELECT_FIELDS} ${join} WHERE ${where} ORDER BY ${sort} LIMIT ?`,
    ...(opts.params ?? []),
    opts.limit ?? 8,
  );
  const enriched = groupByProduct(rows);
  return rows.map((row, i) => toCard(row, enriched[i]));
}

export function featuredStrip(kind: "new" | "bestsellers" | "sale" | "featured", limit = 8): ProductCard[] {
  const map: Record<"new" | "bestsellers" | "sale" | "featured", [string, (string | number)[]]> = {
    new: ["p.is_new_arrival = 1 AND p.status = ?", [STOREFRONT_STATUS]],
    bestsellers: ["p.is_bestseller = 1 AND p.status = ?", [STOREFRONT_STATUS]],
    sale: ["p.compare_at_price IS NOT NULL AND p.compare_at_price > p.price AND p.status = ?", [STOREFRONT_STATUS]],
    featured: ["p.is_featured = 1 AND p.status = ?", [STOREFRONT_STATUS]],
  };
  const [clause, params] = map[kind];
  const rows = pickProducts(clause, { limit, params, sort: kind === "bestsellers" ? "popular" : "newest" });
  // Fall back to the newest catalogue rows so a home section is never empty.
  if (rows.length === 0 && (kind === "featured" || kind === "new")) {
    return pickProducts("p.status = ?", { limit, params: [STOREFRONT_STATUS] });
  }
  return rows;
}

export function buildFacets(query: Partial<ShopQuery>): Facets {
  const join = PRODUCT_JOIN;

  const sizesWhere = buildWhere({ q: query, skip: ["sizes"] });
  const colorsWhere = buildWhere({ q: query, skip: ["colors"] });
  const catWhere = buildWhere({ q: query, skip: ["category"] });
  const priceWhere = buildWhere({ q: query, skip: ["price"] });
  const base = buildWhere({ q: query });

  const combine = (extra: string, w: { sql: string; params: (string | number)[] }) => ({
    sql: w.sql ? `${w.sql} AND ${extra}` : `WHERE ${extra}`,
    params: w.params,
  });

  const sizes = all<{ label: string; count: number }>(
    `SELECT s.label AS label, COUNT(DISTINCT p.id) AS count
       FROM products p
       JOIN product_variants v ON v.product_id = p.id AND v.is_active = 1 AND v.stock > 0
       JOIN sizes s ON s.id = v.size_id
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN product_availability av ON av.product_id = p.id
      ${sizesWhere.sql}
      GROUP BY s.label ORDER BY s.sort ASC, s.label ASC`,
    ...sizesWhere.params,
  ).filter((r) => r.label && r.label !== "Ones");

  const colors = all<{ name: string; hex: string | null; count: number }>(
    `SELECT co.name AS name, co.hex AS hex, COUNT(DISTINCT p.id) AS count
       FROM products p
       JOIN product_variants v ON v.product_id = p.id AND v.is_active = 1 AND v.stock > 0
       JOIN colors co ON co.id = v.color_id
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN product_availability av ON av.product_id = p.id
      ${colorsWhere.sql}
      GROUP BY co.name ORDER BY count DESC, co.name ASC LIMIT 14`,
    ...colorsWhere.params,
  );

  const categories = all<{ name: string; slug: string; count: number }>(
    `SELECT c.name AS name, c.slug AS slug, COUNT(p.id) AS count ${join} ${catWhere.sql}
      GROUP BY c.name, c.slug HAVING count > 0 ORDER BY count DESC LIMIT 16`,
    ...catWhere.params,
  );

  const price =
    get<{ minPrice: number | null; maxPrice: number | null }>(
      `SELECT MIN(p.price) AS minPrice, MAX(p.price) AS maxPrice ${join} ${priceWhere.sql}`,
      ...priceWhere.params,
    ) ?? { minPrice: null, maxPrice: null };

  const counts =
    get<{ onSale: number; inStock: number }>(
      `SELECT SUM(CASE WHEN p.compare_at_price > p.price THEN 1 ELSE 0 END) AS onSale,
              SUM(CASE WHEN COALESCE(av.stock,0) > 0 THEN 1 ELSE 0 END) AS inStock ${join} ${base.sql}`,
      ...base.params,
    ) ?? { onSale: 0, inStock: 0 };

  return {
    sizes: sizes.map((s) => ({ label: s.label, count: s.count })),
    colors: colors.map((c) => ({ name: c.name, hex: c.hex, count: c.count })),
    categories: categories.map((c) => ({ name: c.name, slug: c.slug, count: c.count })),
    price: { min: Math.floor((price.minPrice ?? 0) / 100) * 100, max: Math.ceil((price.maxPrice ?? 3000) / 100) * 100 },
    onSale: counts.onSale ?? 0,
    inStock: counts.inStock ?? 0,
  };
}

export function getProductBySlug(slug: string, { includeHidden = false } = {}): ProductDetail | null {
  const join = PRODUCT_JOIN;
  const row = get<RawProduct>(
    `${SELECT_FIELDS} ${join} WHERE p.slug = ?${includeHidden ? "" : " AND p.status = ?"}`,
    slug,
    ...(includeHidden ? [] : [STOREFRONT_STATUS]),
  );
  if (!row) return null;

  const [extra] = groupByProduct([row]);
  const card = toCard(row, extra);

  return {
    ...card,
    description: row.description,
    fabric: row.fabric,
    care: row.care,
    sku: row.sku,
    gallery: extra.images,
    variants: extra.variants,
    lowStockThreshold: row.lowStockThreshold,
    soldQty: row.soldQty,
    status: row.status as ProductDetail["status"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    categoryId: row.categoryId,
  };
}

export function getProductsByIds(ids: number[]): ProductCard[] {
  if (!ids.length) return [];
  const join = PRODUCT_JOIN;
  const rows = all<RawProduct>(
    `${SELECT_FIELDS} ${join} WHERE p.id IN (${inClause(ids)}) AND p.status = ?`,
    ...ids,
    STOREFRONT_STATUS,
  );
  const enriched = groupByProduct(rows);
  return rows.map((row, i) => toCard(row, enriched[i]));
}

/** Same category first, then best sellers — never the product itself. */
export function relatedProducts(product: ProductDetail, limit = 4): ProductCard[] {
  const primary = all<RawProduct>(
    `${SELECT_FIELDS} ${PRODUCT_JOIN}
      WHERE p.status = ? AND p.id <> ?
        AND (p.category_id = ? OR (p.brand IS NOT NULL AND p.brand = ?))
      ORDER BY (p.category_id = ?) DESC, COALESCE(av.stock,0) > 0 DESC, COALESCE(p.sold_qty,0) DESC
      LIMIT ?`,
    STOREFRONT_STATUS,
    product.id,
    product.categoryId ?? -1,
    product.brand ?? "",
    product.categoryId ?? -1,
    limit,
  );

  const chosen = new Set(primary.map((r) => r.id));
  const rest: RawProduct[] = [];
  if (primary.length < limit) {
    for (const row of all<RawProduct>(
      `${SELECT_FIELDS} ${PRODUCT_JOIN}
        WHERE p.status = ? AND p.id <> ?
        ORDER BY COALESCE(p.sold_qty,0) DESC, p.is_featured DESC
        LIMIT ?`,
      STOREFRONT_STATUS,
      product.id,
      limit * 2,
    )) {
      if (chosen.has(row.id)) continue;
      rest.push(row);
      if (primary.length + rest.length >= limit) break;
    }
  }

  const finalRows = [...primary, ...rest].slice(0, limit);
  const enriched = groupByProduct(finalRows);
  return finalRows.map((row, i) => toCard(row, enriched[i]));
}

/** Type-ahead for the global search box. */
export function searchSuggestions(term: string, limit = 8) {
  const words = likeParams(term);
  if (!words.length) return { products: [] as ProductCard[], categories: [] as { name: string; slug: string }[] };
  const like = words.map((w) => `%${w}%`);
  const join = PRODUCT_JOIN;
  const clauses = words
    .map(
      () =>
        `(p.name LIKE ? ESCAPE '\\' OR COALESCE(p.brand,'') LIKE ? ESCAPE '\\' OR COALESCE(p.sku,'') LIKE ? ESCAPE '\\' OR COALESCE(c.name,'') LIKE ? ESCAPE '\\')`,
    )
    .join(" AND ");

  const rows = all<RawProduct>(
    `${SELECT_FIELDS} ${join} WHERE p.status = ? AND ${clauses}
      ORDER BY COALESCE(p.sold_qty,0) DESC, p.name ASC LIMIT ?`,
    STOREFRONT_STATUS,
    ...like.flatMap((l) => [l, l, l, l]),
    limit,
  );
  const enriched = groupByProduct(rows);

  const categories = all<{ name: string; slug: string }>(
    `SELECT name, slug FROM categories
      WHERE is_active = 1 AND (${words.map(() => "name LIKE ? ESCAPE '\\'").join(" OR ")})
      LIMIT 4`,
    ...like,
  );

  return {
    products: rows.map((row, i) => toCard(row, enriched[i])),
    categories,
  };
}
