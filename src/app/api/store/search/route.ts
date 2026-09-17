import { z } from "zod";
import { handle } from "@/server/http/handler";
import { searchSuggestionsCached } from "@/server/queries";

/** Type-ahead for the header search. Debounced client-side, cached server-side. */
const querySchema = z.object({
  q: z.string().trim().max(120).default(""),
  limit: z.coerce.number().int().min(1).max(12).default(6),
});

export const GET = handle({ query: querySchema }, async ({ query }) => {
  const term = query.q.trim();
  if (term.length < 2) return { products: [], categories: [], query: term, hint: "Type at least two letters" };

  const found = searchSuggestionsCached(term, query.limit);
  return {
    query: term,
    products: found.products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      discountPct: product.discountPct,
      image: product.image,
      category: product.category?.name ?? null,
      inStock: product.inStock,
      sizes: product.sizes.slice(0, 6),
    })),
    categories: found.categories,
  };
});
