import type { ShopQueryInput } from "@/server/repositories/products.repository";

/**
 * The shop URL is the source of truth for filtering — no component-level filter
 * state. That keeps a filtered view shareable, means the back button works as
 * shoppers expect, and lets the server render the same list on first paint.
 *
 * The keys here match the server-side query schema 1:1 on purpose; the only
 * translation left to do is splitting the comma-separated lists.
 */
export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "popular", label: "Most popular" },
  { value: "price_low", label: "Price: low to high" },
  { value: "price_high", label: "Price: high to low" },
  { value: "discount", label: "Biggest discount" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export const COLLECTION_OPTIONS = [
  { value: "new", label: "New arrivals" },
  { value: "bestsellers", label: "Best sellers" },
  { value: "sale", label: "On sale" },
  { value: "featured", label: "Featured" },
] as const;

export type CollectionKey = (typeof COLLECTION_OPTIONS)[number]["value"];

export const PRICE_BANDS = [
  { label: "Under ₹2,000", min: undefined, max: 2000 },
  { label: "₹2,000 – ₹4,000", min: 2000, max: 4000 },
  { label: "₹4,000 – ₹7,000", min: 4000, max: 7000 },
  { label: "₹7,000 & above", min: 7000, max: undefined },
] as const;

export const PER_PAGE = 24;

export type ShopQuery = {
  q: string;
  category: string;
  collection: CollectionKey | "";
  sizes: string[];
  colors: string[];
  min: number | undefined;
  max: number | undefined;
  availability: "all" | "in_stock";
  sort: SortKey;
  page: number;
  /** Server-side only — the page size is decided by the route, not the shopper. */
  perPage?: number;
};

export const EMPTY_QUERY: ShopQuery = {
  q: "",
  category: "",
  collection: "",
  sizes: [],
  colors: [],
  min: undefined,
  max: undefined,
  availability: "all",
  sort: "newest",
  page: 1,
};

const SORT_VALUES = SORT_OPTIONS.map((s) => s.value) as string[];
const COLLECTION_VALUES = COLLECTION_OPTIONS.map((c) => c.value) as string[];

/** Parse a raw `search` string (`"sizes=M,L&sort=price_low"`) into a query object. */
export function parseShopQuery(search: string | URLSearchParams): ShopQuery {
  const params = typeof search === "string" ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search) : search;
  const sort = params.get("sort");
  const collection = params.get("collection");
  const page = Number(params.get("page") ?? 1);

  return {
    q: (params.get("q") ?? "").trim().slice(0, 120),
    category: (params.get("category") ?? "").trim().slice(0, 80),
    collection: collection && COLLECTION_VALUES.includes(collection) ? (collection as CollectionKey) : "",
    sizes: splitList(params.get("sizes")),
    colors: splitList(params.get("colors")),
    min: numberOrUndefined(params.get("min")),
    max: numberOrUndefined(params.get("max")),
    availability: params.get("availability") === "in_stock" ? "in_stock" : "all",
    sort: sort && SORT_VALUES.includes(sort) ? (sort as SortKey) : "newest",
    page: Number.isFinite(page) && page > 1 ? Math.min(page, 200) : 1,
  };
}

/** Serialise back to a query string, dropping anything that equals the default. */
export function buildShopQuery(query: Partial<ShopQuery>): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.collection) params.set("collection", query.collection);
  if (query.sizes?.length) params.set("sizes", query.sizes.join(","));
  if (query.colors?.length) params.set("colors", query.colors.join(","));
  if (typeof query.min === "number") params.set("min", String(query.min));
  if (typeof query.max === "number") params.set("max", String(query.max));
  if (query.availability && query.availability !== "all") params.set("availability", query.availability);
  if (query.sort && query.sort !== "newest") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  return params.toString();
}

export function withBase(basePath: string, query: Partial<ShopQuery>) {
  const qs = buildShopQuery(query);
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Feeds the repository. Empty strings become undefined so the SQL skips them. */
export function toShopQueryInput(query: ShopQuery, perPage = PER_PAGE): ShopQueryInput {
  return {
    q: query.q || undefined,
    category: query.category || undefined,
    collection: query.collection || undefined,
    sizes: query.sizes.length ? query.sizes.join(",") : undefined,
    colors: query.colors.length ? query.colors.join(",") : undefined,
    min: query.min,
    max: query.max,
    availability: query.availability,
    sort: query.sort,
    page: query.page,
    perPage,
  };
}

export function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

export function toggleValueInQuery<K extends "sizes" | "colors">(query: ShopQuery, key: K, value: string): ShopQuery {
  return { ...query, page: 1, [key]: toggleValue(query[key], value) } as ShopQuery;
}

export function activeFilterCount(query: ShopQuery) {
  return (
    (query.category ? 1 : 0) +
    (query.collection ? 1 : 0) +
    (query.availability === "in_stock" ? 1 : 0) +
    (typeof query.min === "number" || typeof query.max === "number" ? 1 : 0) +
    query.sizes.length +
    query.colors.length
  );
}

export function priceBandLabel(query: ShopQuery) {
  if (typeof query.min === "number" || typeof query.max === "number") {
    return PRICE_BANDS.find((band) => band.min === query.min && band.max === query.max)?.label;
  }
  return undefined;
}

function splitList(value: string | null): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function numberOrUndefined(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value.replace(/[^0-9]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/** Next 15 gives `searchParams` as a promise of string | string[] — flatten it. */
export function searchParamsToString(sp: Record<string, string | string[] | undefined> | undefined): string {
  if (!sp) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  return params.toString();
}
