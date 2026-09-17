/**
 * Client-side fetch helper. Every JSON call in the app goes through it so that
 * errors are always normalised (`{error: {message, fields}}` → typed), and no
 * component needs to think about `res.ok`.
 */

export type ApiFailure = {
  message: string;
  fields?: Record<string, string>;
  code?: string;
};

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  code?: string;
  constructor({ message, status, fields, code }: ApiFailure & { status: number }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
    this.code = code;
  }
}

const GENERIC_FAILURE =
  "Something went wrong at our end. Please check your connection and try again.";

export async function apiFetch<T>(
  url: string,
  init: RequestInit & { method?: string } = {},
): Promise<T> {
  const { headers, body, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      body: body instanceof FormData ? body : body ?? undefined,
      headers: {
        ...(body instanceof FormData ? {} : { "content-type": "application/json" }),
        ...(headers ?? {}),
      },
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError({ message: GENERIC_FAILURE, status: 0, code: "network" });
  }

  if (res.status === 204) return undefined as T;

  const isJson = (res.headers.get("content-type") ?? "").includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message =
      (payload?.error as string) ??
      payload?.message ??
      (res.status === 401 ? "Please sign in to continue." : GENERIC_FAILURE);
    throw new ApiError({
      status: res.status,
      message,
      fields: payload?.fields,
      code: payload?.code,
    });
  }
  return (payload ?? null) as T;
}

export const api = {
  get: <T>(url: string) =>
    apiFetch<T>(url, { method: "GET", cache: "no-store" }),
  post: <T>(url: string, data?: unknown) =>
    apiFetch<T>(url, { method: "POST", body: typeof data === "string" ? data : JSON.stringify(data ?? {}) }),
  put: <T>(url: string, data?: unknown) =>
    apiFetch<T>(url, { method: "PUT", body: JSON.stringify(data ?? {}) }),
  patch: <T>(url: string, data?: unknown) =>
    apiFetch<T>(url, { method: "PATCH", body: JSON.stringify(data ?? {}) }),
  del: <T>(url: string, data?: unknown) =>
    apiFetch<T>(url, {
      method: "DELETE",
      body: data === undefined ? undefined : JSON.stringify(data),
    }),
};
