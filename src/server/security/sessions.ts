/**
 * Sessions.
 *
 * A session is a random 32-byte token. The browser only ever sees
 * `token.signature`; the database stores `sha256(token)` and nothing else.
 *
 *  • signature  → verified in edge middleware with Web Crypto (cheap gate)
 *  • DB row     → authoritative check in every admin route/page (`requireAdmin`)
 *  • logout     → sets `revoked_at`, so a stolen cookie dies with the session
 */
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/server/env";
import { db, get, insert, nowIso, run } from "@/server/db";
import { hashToken, randomToken, safeEqual } from "@/server/security/crypto";

export const CUSTOMER_COOKIE = "amw_cust";
export const ADMIN_COOKIE = "amw_admin";

const CUSTOMER_TTL_DAYS = 30;
const ADMIN_TTL_HOURS = 12;

export type SubjectType = "customer" | "admin";

export function sign(token: string): string {
  return crypto.createHmac("sha256", env.sessionSecret).update(token).digest("base64url").slice(0, 43);
}

export function verifySignature(value: string): boolean {
  const [token, sig] = value.split(".");
  if (!token || !sig) return false;
  return safeEqual(sign(token), sig);
}

export function parseToken(value: string | undefined): string | null {
  if (!value) return null;
  const [token, sig] = value.split(".");
  if (!token || !sig) return null;
  if (!safeEqual(sign(token), sig)) return null;
  return token;
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: maxAgeSeconds,
  } as const;
}

export async function createSession(
  subjectType: SubjectType,
  subjectId: number,
  req?: Request,
): Promise<void> {
  const token = randomToken(32);
  const expiresAt = new Date(
    Date.now() + (subjectType === "admin" ? ADMIN_TTL_HOURS * 3600 : CUSTOMER_TTL_DAYS * 86400) * 1000,
  ).toISOString();

  insert(
    `INSERT INTO auth_sessions (subject_type, subject_id, token_hash, user_agent, ip, expires_at)
     VALUES (?,?,?,?,?,?)`,
    subjectType,
    subjectId,
    hashToken(token),
    (req?.headers.get("user-agent") ?? "").slice(0, 200) || null,
    clientIp(req) || null,
    expiresAt,
  );

  const store = await cookies();
  store.set(subjectType === "admin" ? ADMIN_COOKIE : CUSTOMER_COOKIE, `${token}.${sign(token)}`, {
    ...cookieOptions(subjectType === "admin" ? ADMIN_TTL_HOURS * 3600 : CUSTOMER_TTL_DAYS * 86400),
  });
}

export function clientIp(req?: Request): string | null {
  const h = req?.headers;
  return (
    h?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h?.get("x-real-ip") ||
    null
  );
}

/** Returns the session row when the cookie maps to a live, unexpired session. */
export function readSession(subjectType: SubjectType, token: string | null) {
  if (!token) return undefined;
  return get<{ id: number; subject_id: number; expires_at: string }>(
    `SELECT id, subject_id, expires_at FROM auth_sessions
      WHERE subject_type = ? AND token_hash = ? AND revoked_at IS NULL AND expires_at > ?
      ORDER BY id DESC LIMIT 1`,
    subjectType,
    hashToken(token),
    nowIso(),
  );
}

export async function getSessionToken(subjectType: SubjectType): Promise<string | null> {
  const store = await cookies();
  return parseToken(store.get(subjectType === "admin" ? ADMIN_COOKIE : CUSTOMER_COOKIE)?.value);
}

export async function revokeCurrentSession(subjectType: SubjectType) {
  const token = await getSessionToken(subjectType);
  if (!token) return;
  run(
    `UPDATE auth_sessions SET revoked_at = ?
      WHERE token_hash = ? AND subject_type = ? AND revoked_at IS NULL`,
    nowIso(),
    hashToken(token),
    subjectType,
  );
}

export async function revokeAllSessions(subjectType: SubjectType, subjectId: number) {
  run(
    `UPDATE auth_sessions SET revoked_at = ? WHERE subject_type = ? AND subject_id = ? AND revoked_at IS NULL`,
    nowIso(),
    subjectType,
    subjectId,
  );
}

/** Housekeeping so the sessions table cannot grow without bound. */
export function purgeExpiredSessions() {
  const res = db().raw.prepare(`DELETE FROM auth_sessions WHERE expires_at < ?`).run(nowIso());
  return res.changes;
}
