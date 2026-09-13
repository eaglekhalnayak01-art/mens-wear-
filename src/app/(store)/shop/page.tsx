import type { Metadata } from "next";
import { ShopView } from "@/components/shop/shop-view";
import { PageHeader } from "@/components/layout/page-header";
import { getCategories, getSettings, getShopProducts } from "@/server/queries";
import { PER_PAGE, parseShopQuery, searchParamsToString, toShopQueryInput } from "@/lib/shop-url";

export const metadata: Metadata = {
  title: "Shop all clothing",
  description:
    "Shirts, suits, denim, kurtas and knitwear from Aakash Men's Wear. Filter by size, colour, price and availability — every piece listed is what is actually in the shop.",
  alternates: { canonical: "/shop" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = searchParamsToString(await searchParams);
  const query = parseShopQuery(raw);
  const settings = getSettings();

  // A search submitted from the header lands here, so the page has to speak for
  // the term as well as the catalogue.
  const heading = query.q
    ? { eyebrow: "Search", title: `“${query.q}”`, description: `Matching pieces across the shop. Sort by popularity if you want the usual suspects first.` }
    : {
        eyebrow: "The rail",
        title: query.category ? "Shop by category" : "Everything in the shop",
        description:
          "Thirty-odd pieces, chosen one at a time. If you cannot find a size, message us — half of what we sell is ordered in for a specific customer.",
      };

  const { items, total, facets } = getShopProducts(toShopQueryInput(query, PER_PAGE));
  const categories = getCategories().filter((category) => category.parent_id === null);

  return (
    <>
      <PageHeader
        eyebrow={heading.eyebrow}
        title={heading.title}
        description={heading.description}
        breadcrumb={[{ name: "Home", href: "/" }, { name: "Shop" }]}
        meta={total > 0 ? `${total} pieces · from ${Math.min(...items.map((item) => item.price)).toLocaleString("en-IN")}` : undefined}
      />
      <div className="shop-shell pb-16 pt-8">
        <ShopView
          products={items}
          facets={facets}
          total={total}
          query={{ ...query, perPage: PER_PAGE }}
          basePath="/shop"
          categories={categories.map((category) => ({ id: category.id, name: category.name, slug: category.slug }))}
          emptyTitle={query.q ? `Nothing matches “${query.q}”` : "No pieces match those filters"}
          emptyText={
            query.q
              ? `We could not find that in ${settings.shopName}. Spellings vary, so try a shorter word — “shirt”, “kurta”, “denim” — or ask us on WhatsApp and we will check the shelves.`
              : "Try removing a filter or two — the catalogue is small and specific, so a narrow combination can come up empty."
          }
        />
      </div>
    </>
  );
}
