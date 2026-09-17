/**
 * Fixed-window rate limiter, in-process.
 *
 * Deliberately simple: this app runs as one Node process for the shop, and it
 * only guards expensive/abusable endpoints (OTP request, OTP verify, admin
 * login, order placement). Swap the Map for Redis/Upstash if the store ever
 * runs multiple instances — `consume()` is the only call sites depend on.
 */

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();
const globalCache = globalThis as unknown as { __amwRate?: Map<string, Bucket> };
if (!globalCache.__amwRate) globalCache.__amwRate = store;

export type RateResult = { ok: true } | { ok: false; retryAfterSec: number };

export function consume(key: string, limit: number, windowMs: number): RateResult {
  const buckets = globalCache.__amwRate!;
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (existing.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }
  existing.count += 1;
  return { ok: true };
}

export function reset(key: string) {
  globalCache.__amwRate!.delete(key);
}

/** Keeps the map from growing forever on a long-lived dev server. */
setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of globalCache.__amwRate!) {
      if (bucket.resetAt <= now) globalCache.__amwRate!.delete(key);
    }
  },
  5 * 60 * 1000,
).unref?.();
