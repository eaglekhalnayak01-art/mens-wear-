import { z } from "zod";
import { handle } from "@/server/http/handler";
import { adminImageListSchema } from "@/server/validation/schemas";
import { getAdminProduct, reorderImages } from "@/server/repositories/products.admin";
import { deleteStoredImage } from "@/server/services/uploads.service";
import { notFound } from "@/server/http/errors";
import { invalidate } from "@/server/db/query-cache";

const idParam = z.object({ id: z.coerce.number().int().positive() });

/**
 * Replaces the image list and its order in a single write: the manager sends the
 * full ordered set with the chosen primary, so reordering, "make primary" and
 * alt text are all the same call. `reorderImages` rewrites the rows in a
 * transaction, which is why nothing needs to be diffed here.
 */
export const PUT = handle({ auth: "admin", body: adminImageListSchema }, async ({ body, params }) => {
  const { id } = idParam.parse(params);
  if (!getAdminProduct(id)) throw notFound("That product is not in the catalogue.");
  const incoming: { src: string; alt?: string; isPrimary?: boolean }[] = body.images ?? [];
  const result = reorderImages(
    id,
    incoming.map((image) => ({ src: image.src, alt: image.alt ?? "" })),
    incoming.find((image) => image.isPrimary)?.src,
  );
  invalidate("products", "shop");
  return { ok: true, count: result.count };
});

export const DELETE = handle(
  { auth: "admin", body: z.object({ src: z.string().trim().min(1).max(400) }) },
  async ({ body, params }) => {
    const { id } = idParam.parse(params);
    const product = getAdminProduct(id);
    if (!product) throw notFound("That product is not in the catalogue.");

    const remaining = product.gallery.filter((image) => image.src !== body.src);
    reorderImages(id, remaining.map((image) => ({ src: image.src, alt: image.alt })));
    // Only files we uploaded are removed from disk; shared catalogue photos stay.
    await deleteStoredImage(body.src).catch(() => undefined);
    invalidate("products", "shop");
    return { ok: true, images: remaining };
  },
);
