/**
 * HTTP error vocabulary for the JSON API.
 *
 * Rules: never leak SQL/stack details to the browser, and never show a customer
 * a technical message — the UI has a designed state for every code below.
 */
import { NextResponse } from "next/server";

export type ErrorCode =
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "out_of_stock"
  | "network"
  | "server_error";

export class HttpError extends Error {
  status: number;
  code: ErrorCode;
  fields?: Record<string, string>;
  meta?: Record<string, unknown>;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    opts: { fields?: Record<string, string>; meta?: Record<string, unknown> } = {},
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.fields = opts.fields;
    this.meta = opts.meta;
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new HttpError(400, "validation", message, { fields });
export const unauthorized = (message = "Please sign in to continue.") =>
  new HttpError(401, "unauthorized", message);
export const forbidden = (message = "You do not have access to this area.") =>
  new HttpError(403, "forbidden", message);
export const notFound = (message = "We could not find what you were looking for.") =>
  new HttpError(404, "not_found", message);
export const conflict = (message: string, fields?: Record<string, string>) =>
  new HttpError(409, "conflict", message, { fields });
export const rateLimited = (message: string, retryAfterSec = 60) =>
  new HttpError(429, "rate_limited", message, { meta: { retryAfterSec } });
export const outOfStock = (message = "This size just went out of stock.") =>
  new HttpError(409, "out_of_stock", message);

export function errorBody(error: unknown) {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      body: {
        error: error.message,
        code: error.code,
        ...(error.fields ? { fields: error.fields } : {}),
        ...(error.meta ?? {}),
      },
    };
  }
  // Unknown failure: log the real cause server-side, show a calm message.
  console.error("[api] unhandled error", error);
  return {
    status: 500,
    body: {
      error: "We hit a snag on our side and the team has been notified. Please try again.",
      code: "server_error" as ErrorCode,
    },
  };
}

export function jsonError(error: unknown, extraHeaders: Record<string, string> = {}) {
  const { status, body } = errorBody(error);
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store", ...extraHeaders },
  });
}
