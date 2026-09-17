/**
 * A tiny tag-aware read cache for the SQLite data layer.
 *
 * Reads are synchronous (node:sqlite) and cheap, but a storefront page issues a
 * handful of them per request — and the same queries repeat across visitors.
 * Caching by tag means one call after an admin write (`invalidate("products")`)
 * is enough to keep the shop honest, while shoppers get instant responses.
 *
 * We also poke Next's own tag cache when a request context exists, so any
 * static/ISR page revalidates too. That call throws outside a request (e.g. in
 * the seeder), hence the guard.
 */
import { revalidateTag } from "next/cache";

type Entry = { value: unknown; expires: number; tags: string[] };

const store = new Map<string, Entry>();
const globalCache = globalThis as unknown as { __amwQueryCache?: Map<string, Entry> };
const cache = (globalCache.__amwQueryCache ??= store);

const DEFAULT_TTL_MS = 30_000;

export function cached<T>(key: string, fn: () => T, options: { tags?: string[]; ttlMs?: number } = {}): T {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.value as T;

  const value = fn();
  cache.set(key, { value, expires: now + (options.ttlMs ?? DEFAULT_TTL_MS), tags: options.tags ?? [] });
  return value as T;
}

/** JSON-safe key builder for query objects. */
export function cacheKey(namespace: string, ...parts: unknown[]) {
  return `${namespace}:${parts
    .map((part) => (typeof part === "string" ? part : JSON.stringify(part ?? null)))
    .join("|")}`;
}

export function invalidate(...tags: string[]) {
  if (!tags.length) {
    cache.clear();
  } else {
    for (const [key, entry] of cache) {
      if (entry.tags.some((tag) => tags.includes(tag))) cache.delete(key);
    }
  }
  try {
    for (const tag of tags.length ? tags : ["products", "orders", "settings"]) revalidateTag(tag);
  } catch {
    /* no request context (seeder / script) — the in-process cache is enough */
  }
}

export function cacheStats() {
  return { entries: cache.size };
}
