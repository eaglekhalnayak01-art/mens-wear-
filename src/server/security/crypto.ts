/**
 * Password + token primitives. Uses Node's scrypt (memory-hard, no native
 * build step) instead of bcrypt, and a self-describing hash format so cost
 * parameters can be raised later without breaking existing logins.
 */
import crypto from "node:crypto";
import { promisify } from "node:util";

// `promisify` only models the 3-argument overload, so re-type the options form.
const scryptAsync = promisify(crypto.scrypt) as unknown as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem?: number },
) => Promise<Buffer>;

const PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 } as const;

export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derived = await scryptAsync(plain.normalize("NFKC"), salt, PARAMS.keylen, {
    N: PARAMS.N,
    r: PARAMS.r,
    p: PARAMS.p,
  });
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

export async function verifyPassword(plain: string, stored?: string | null): Promise<boolean> {
  if (!stored) return false;
  const [scheme, N, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  try {
    const expected = Buffer.from(hash, "base64");
    const derived = await scryptAsync(plain.normalize("NFKC"), Buffer.from(salt, "base64"), expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
    });
    return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

/** URL-safe random token (session ids, order tracking refs). */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** 6-digit numeric OTP, uniformly sampled (not `randomInt`-biased by modulo). */
export function randomOtp(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Tokens are only ever persisted as SHA-256 — a DB leak cannot replay a cookie. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function hmac(value: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Used for OTP comparison: compare fixed-length digests so the number of
 * matching characters never leaks through timing.
 */
export function digestEquals(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}
