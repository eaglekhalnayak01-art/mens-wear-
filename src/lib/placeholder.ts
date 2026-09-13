/**
 * A product needs *something* where its photography has not been shot yet.
 * Instead of a grey rectangle we render a flat garment sketch on the shop's
 * bone background with the piece's name set in the display face — a lookbook
 * placeholder, which is what a real store does before the shoot.
 */
export function placeholderImage(seed: string, kind?: string, name?: string) {
  const params = new URLSearchParams();
  if (kind) params.set("kind", kind);
  if (name) params.set("name", name);
  const query = params.toString();
  return `/api/placeholder/${encodeURIComponent(seed)}.svg${query ? `?${query}` : ""}`;
}
