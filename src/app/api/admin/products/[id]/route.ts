import { z } from "zod";
import { handle } from "@/server/http/handler";
import { adminProductPatchSchema, adminProductSchema, inlineEditSchema } from "@/server/validation/schemas";
import { deleteProduct, getAdminProduct, patchProduct, updateProduct } from "@/server/repositories/products.admin";
import { deleteStoredImage } from "@/server/services/uploads.service";
import { badRequest, notFound } from "@/server/http/errors";
import { invalidate } from "@/server/db/query-cache";

const idParam = z.object({ id: z.coerce.number().int().positive() });

export const GET = handle({ auth: "admin" }, async ({ params }) => {
  const { id } = idParam.parse(params);
  const product = getAdminProduct(id);
  if (!product) throw notFound("That product is not in the catalogue.");
  return { product };
});

/** Full save from the product form. Images that were removed are cleaned up. */
export const PUT = handle({ auth: "admin", body: adminProductSchema }, async ({ body, params }) => {
  const { id } = idParam.parse(params);
  const before = getAdminProduct(id);
  if (!before) throw notFound("That product is not in the catalogue.");

  updateProduct(id, body);
  await pruneImages(before.gallery ?? [], body.images ?? []);
  invalidate("products", "shop", "categories");
  return { ok: true, id };
});

/** Inline table edits: price, status, the three flags, low-stock threshold. */
export const PATCH = handle({ auth: "admin", body: adminProductPatchSchema }, async ({ body, params }) => {
  const { id } = idParam.parse(params);
  const { id: _ignored, ...patch } = body;
  if (Object.keys(patch).length === 0) throw badRequest("Nothing to change.");
  const changed = patchProduct(id, patch as Record<string, unknown>);
  if (!changed) throw notFound("That product is not in the catalogue.");
  invalidate("products", "shop");
  return { ok: true };
});

export const DELETE = handle({ auth: "admin" }, async ({ params }) => {
  const { id } = idParam.parse(params);
  const product = getAdminProduct(id);
  if (!product) throw notFound("That product is already gone.");
  const result = deleteProduct(id);
  // Files are only unlinked when the row itself is gone. A hidden product still
  // appears inside past orders, so its pictures have to stay on disk.
  if ("deleted" in result) {
    for (const image of product.gallery ?? []) await deleteStoredImage(image.src).catch(() => undefined);
  }
  invalidate("products", "shop");
  return { ok: true, ...result };
});

async function pruneImages(before: { src: string }[], after: { src: string }[]) {
  const kept = new Set(after.map((image) => image.src));
  for (const image of before) {
    if (!kept.has(image.src)) await deleteStoredImage(image.src).catch(() => undefined);
  }
}
