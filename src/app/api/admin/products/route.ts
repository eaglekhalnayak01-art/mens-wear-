import { handle } from "@/server/http/handler";
import { adminProductListQuery, adminProductSchema } from "@/server/validation/schemas";
import { createProduct, listAdminProducts } from "@/server/repositories/products.admin";
import { invalidate } from "@/server/db/query-cache";
import { getCategories } from "@/server/queries";

/** Product list for the dashboard table — admin session required by the guard. */
export const GET = handle({ auth: "admin", query: adminProductListQuery }, async ({ query }) => listAdminProducts(query));

/**
 * Creating a product. Slug and per-size SKUs are generated here when left blank,
 * so the owner is never forced to think about keys, and the storefront URL stays
 * stable once set.
 */
export const POST = handle({ auth: "admin", body: adminProductSchema }, async ({ body }) => {
  const categories = getCategories();
  const category = categories.find((entry) => entry.id === body.categoryId);
  const id = createProduct({
    ...body,
    subCategory: body.subCategory ?? category?.name,
  });
  invalidate("products", "shop");
  return { ok: true, id };
});
