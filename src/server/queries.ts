/**
 * Read facade for pages (server components) and public API routes.
 *
 * Pages call these instead of the repositories directly: it is the one place
 * that decides what is cacheable, so an admin write followed by a page load can
 * never show a stale price. Admin-facing reads are deliberately uncached —
 * the owner must always see the live shop.
 */
import { cacheKey, cached } from "@/server/db/query-cache";
import {
  listProducts,
  getProductBySlug,
  relatedProducts,
  featuredStrip,
  searchSuggestions,
  type ShopQueryInput,
} from "@/server/repositories/products.repository";
import { listCategories, categoryBySlug, featuredTiles, childCategories } from "@/server/repositories/categories.repository";
import { readSettings } from "@/server/repositories/settings.repository";
import { inventoryAlerts } from "@/server/repositories/inventory.repository";
import { dashboardStats } from "@/server/repositories/orders.repository";
import type { ProductCard, ProductDetail } from "@/server/repositories/types";
import type { ShopQuery } from "@/server/validation/schemas";

const CATALOGUE_TAGS = ["products", "shop"];

export function getSettings() {
  return cached("settings:store", () => readSettings(), { tags: ["settings"], ttlMs: 5 * 60_000 });
}

export function getShopProducts(query: Partial<ShopQuery>) {
  const normalized: ShopQueryInput = {
    ...(query as ShopQueryInput),
    sort: query.sort ?? "newest",
    page: query.page ?? 1,
    perPage: query.perPage ?? 12,
    availability: query.availability ?? "all",
  };
  return cached(`shop:list:${cacheKey("", normalized)}`, () => listProducts(normalized), {
    tags: CATALOGUE_TAGS,
    ttlMs: 20_000,
  });
}

export function getProduct(slug: string): ProductDetail | null {
  return cached(`shop:product:${slug}`, () => getProductBySlug(slug), { tags: CATALOGUE_TAGS, ttlMs: 20_000 });
}

export function getProductWithRelated(slug: string): { product: ProductDetail; related: ProductCard[] } | null {
  return cached(`shop:product-page:${slug}`, () => {
    const product = getProductBySlug(slug);
    if (!product) return null;
    return { product, related: relatedProducts(product, 4) };
  }, { tags: CATALOGUE_TAGS, ttlMs: 20_000 });
}

export function getStrip(kind: "new" | "bestsellers" | "sale" | "featured", limit = 8): ProductCard[] {
  return cached(`shop:strip:${kind}:${limit}`, () => featuredStrip(kind, limit), { tags: CATALOGUE_TAGS, ttlMs: 30_000 });
}

export function getCategories() {
  return cached("shop:categories", () => listCategories(), { tags: ["categories"], ttlMs: 5 * 60_000 });
}

export function getCategory(slug: string) {
  return cached(`shop:category:${slug}`, () => categoryBySlug(slug), { tags: ["categories", "products"], ttlMs: 60_000 });
}

export function getCategoryChildren(id: number) {
  return cached(`shop:category-children:${id}`, () => childCategories(id), { tags: ["categories"], ttlMs: 5 * 60_000 });
}

export function getFeaturedTiles(limit = 6) {
  return cached(`shop:featured-tiles:${limit}`, () => featuredTiles(limit), { tags: ["categories", "products"], ttlMs: 60_000 });
}

export function searchSuggestionsCached(term: string, limit = 8) {
  const trimmed = term.trim();
  if (trimmed.length < 2) return { products: [], categories: [] };
  return cached(`shop:search:${trimmed}:${limit}`, () => searchSuggestions(trimmed, limit), {
    tags: CATALOGUE_TAGS,
    ttlMs: 30_000,
  });
}

/** Owner dashboard helpers — fresh reads, tiny TTL so refresh feels instant. */
export function getInventoryAlerts() {
  return cached("admin:inventory-alerts", () => inventoryAlerts(), { tags: ["products"], ttlMs: 15_000 });
}

export function getDashboardStats() {
  return cached("admin:dashboard", () => dashboardStats(), { tags: ["orders", "products"], ttlMs: 15_000 });
}
