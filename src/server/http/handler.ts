/**
 * One wrapper for every API route: content negotiation, CSRF check, zod parsing,
 * authorization, rate limiting and error normalisation — so route files contain
 * only the business call itself.
 */
import { NextRequest, NextResponse } from "next/server";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { assertSameOrigin, currentCustomer, requireAdmin, requireCustomer } from "@/server/security/guard";
import { badRequest, errorBody, rateLimited, unauthorized } from "@/server/http/errors";
import { clientIp } from "@/server/security/sessions";
import { consume } from "@/server/security/rate-limit";
import type { AdminUser, CustomerUser } from "@/server/security/guard";

export type HandleOptions = {
  /** public = guest allowed · customer = session required · admin = owner session required */
  auth?: "public" | "customer" | "admin";
  body?: ZodType;
  query?: ZodType;
  /** key includes ip + (optionally) a body field, e.g. the mobile being OTP'd. */
  rate?: { limit: number; windowMs: number; bucket: string; keyFrom?: (body: any) => string };
  csrf?: boolean;
};

export type Ctx<Body = any> = {
  req: NextRequest;
  body: Body;
  query: any;
  params: Record<string, string>;
  customer: CustomerUser | null;
  admin: AdminUser | null;
};

type RouteResult = NextResponse | object | null | void;

function zodIssues(error: ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues.slice(0, 6)) {
    const key = issue.path.join(".") || "form";
    if (!fields[key]) fields[key] = issue.message;
  }
  const first = error.issues[0];
  return { fields, message: first ? first.message : "Please check the highlighted fields." };
}

export function handle<Body = any>(
  options: HandleOptions,
  fn: (ctx: Ctx<Body>) => Promise<RouteResult> | RouteResult,
) {
  // Next's generated route types require a non-optional `params` argument, so the
  // signature is uniform for every route and static segments are simply unused.
  return async function routeHandler(req: NextRequest, segment: { params: Promise<Record<string, string>> }) {
    try {
      if (options.csrf !== false) assertSameOrigin(req);

      const params = (await segment?.params) ?? {};

      // The body is read once, up front, because a rate bucket may be keyed on one of its
      // fields (the mobile being OTP'd, the number placing an order). Parsing it into a
      // typed value happens further down — deliberately *after* authorisation, so an
      // unauthenticated caller cannot collect validation feedback from a admin-only route.
      const raw = await readJson(req);

      if (options.rate) {
        const key = `${options.rate.bucket}:${options.rate.keyFrom ? options.rate.keyFrom(raw) : (clientIp(req) ?? "local")}`;
        const limit = consume(key, options.rate.limit, options.rate.windowMs);
        if (!limit.ok) {
          const wait = Math.ceil(limit.retryAfterSec / 60);
          throw rateLimited(
            limit.retryAfterSec > 60
              ? `Too many attempts. Please try again in ${wait} minute${wait === 1 ? "" : "s"}.`
              : `Too many attempts. Please wait ${limit.retryAfterSec} seconds and try again.`,
            limit.retryAfterSec,
          );
        }
      }

      const auth = options.auth ?? "public";
      let admin: AdminUser | null = null;
      let customer: CustomerUser | null = null;
      if (auth === "admin") admin = await requireAdmin(req);
      if (auth === "customer") customer = await currentCustomer().then((c) => { if (!c) throw unauthorized("Please sign in with your mobile number to continue."); return c; });
      if (auth === "public") customer = await currentCustomer();

      let body: any = {};
      if (options.body) {
        const parsed = options.body.safeParse(raw);
        if (!parsed.success) {
          const { message, fields } = zodIssues(parsed.error);
          throw badRequest(message, fields);
        }
        body = parsed.data;
      }

      let query: any = undefined;
      if (options.query) {
        const parsed = options.query.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
        if (!parsed.success) {
          const { message, fields } = zodIssues(parsed.error);
          throw badRequest(message, fields);
        }
        query = parsed.data;
      }

      const result = await fn({ req, body, query, params, admin, customer });

      if (result instanceof NextResponse) {
        if (!(result.headers.get("cache-control") ?? "").length) {
          result.headers.set("cache-control", "no-store");
        }
        return result;
      }
      return NextResponse.json(result ?? { ok: true }, { headers: { "cache-control": "no-store" } });
    } catch (error) {
      const { status, body } = errorBody(error);
      return NextResponse.json(body, {
        status,
        headers: {
          "cache-control": "no-store",
          ...(status === 429 ? { "retry-after": String((error as any)?.meta?.retryAfterSec ?? 60) } : {}),
        },
      });
    }
  };
}

async function readJson(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    try {
      return await req.json();
    } catch {
      throw badRequest("We could not read your request. Please refresh and try again.");
    }
  }
  if (type.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    return Object.fromEntries(form.entries());
  }
  return {};
}

/** Small alias so routes do not import Next directly. */
export { NextResponse };
