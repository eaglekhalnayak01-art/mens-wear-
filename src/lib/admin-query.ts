/**
 * Small helpers shared by every dashboard screen.
 *
 * Next gives route search params as `Record<string, string | string[]>`, while our
 * zod query schemas want a flat object of strings. `searchParamsToString` exists for
 * the storefront (it builds a query string); the admin screens parse, so they need
 * this shape instead.
 */
export function adminParams(searchParams: Record<string, string | string[] | undefined> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === undefined) continue;
    const flat = Array.isArray(value) ? value.join(",") : String(value);
    if (flat.trim() !== "") out[key] = flat.trim();
  }
  return out;
}

/** Keeps the current filters and swaps one in — used by hand-rolled filter links. */
export function withParam(params: Record<string, string>, key: string, value: string | null) {
  const next = { ...params };
  if (value === null || value === "" || value === "all") delete next[key];
  else next[key] = value;
  delete next.page;
  const query = new URLSearchParams(next).toString();
  return query ? `?${query}` : "";
}
