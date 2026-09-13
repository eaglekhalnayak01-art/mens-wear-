/**
 * Authorization guards.
 *
 * Defence in depth: `middleware.ts` rejects unsigned cookies at the edge (fast,
 * cheap), and every admin page + every admin route re-checks the session in the
 * database here (authoritative — also catches revoked/expired sessions).
 */
import { redirect } from "next/navigation";
import { get } from "@/server/db";
import { ADMIN_COOKIE, CUSTOMER_COOKIE, getSessionToken, parseToken } from "@/server/security/sessions";
import { forbidden, unauthorized } from "@/server/http/errors";
import { env } from "@/server/env";

export type AdminUser = { id: number; name: string; email: string; role: "owner" | "staff" };
export type CustomerUser = { id: number; name: string | null; mobile: string; email: string | null };

export function readCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/** Session lookup that works with a plain `Request` (route handlers). */
async function tokenFromRequest(req: Request, subjectType: "admin" | "customer"): Promise<string | null> {
  const headerCookie = readCookieValue(req.headers.get("cookie"), subjectType === "admin" ? ADMIN_COOKIE : CUSTOMER_COOKIE);
  if (headerCookie) {
    const token = parseToken(headerCookie);
    if (token) return token;
  }
  return getSessionToken(subjectType);
}

export async function currentAdmin(req?: Request): Promise<AdminUser | null> {
  const token = req ? await tokenFromRequest(req, "admin") : await getSessionToken("admin");
  if (!token) return null;
  const { readSession } = await import("@/server/security/sessions");
  const session = readSession("admin", token);
  if (!session) return null;
  const admin = get<AdminUser>(`SELECT id, name, email, role FROM admin_users WHERE id = ?`, session.subject_id);
  return admin ?? null;
}

export async function requireAdmin(req?: Request): Promise<AdminUser> {
  const admin = await currentAdmin(req);
  if (!admin) throw unauthorized("Your owner session expired. Please sign in again.");
  return admin;
}

/** For admin server components — sends the owner to the login screen. */
export async function requireAdminPage(nextPath?: string): Promise<AdminUser> {
  const admin = await currentAdmin();
  if (!admin) redirect(`/admin/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  return admin;
}

export async function currentCustomer(): Promise<CustomerUser | null> {
  const token = await getSessionToken("customer");
  if (!token) return null;
  const { readSession } = await import("@/server/security/sessions");
  const session = readSession("customer", token);
  if (!session) return null;
  const customer = get<CustomerUser>(
    `SELECT id, name, mobile, email FROM customers WHERE id = ?`,
    session.subject_id,
  );
  return customer ?? null;
}

export async function requireCustomer(): Promise<CustomerUser> {
  const customer = await currentCustomer();
  if (!customer) throw unauthorized("Please sign in with your mobile number to continue.");
  return customer;
}

/** For account server components — sends the shopper to the sign-in screen. */
export async function requireCustomerPage(nextPath?: string): Promise<CustomerUser> {
  const customer = await currentCustomer();
  if (!customer) redirect(`/account/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  return customer;
}

/**
 * Cross-site request guard for every state-changing call.
 * SameSite=lax cookies do most of this work; this catches the rest (and any
 * future cookie change) without a token round-trip.
 */
export function assertSameOrigin(req: Request) {
  const method = req.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return;

  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") throw forbidden("Cross-site requests are not allowed.");

  const origin = req.headers.get("origin");
  if (origin) {
    let host: string;
    try {
      host = new URL(origin).host;
    } catch {
      throw forbidden("Blocked request.");
    }
    const allowed = new Set<string>();
    try {
      allowed.add(new URL(env.siteUrl).host);
    } catch {
      /* unset/invalid site url */
    }
    const forwardedHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (forwardedHost) allowed.add(forwardedHost);
    if (!allowed.has(host) && host !== forwardedHost) {
      throw forbidden("Blocked request: this form is not allowed to submit from another site.");
    }
  }
}
