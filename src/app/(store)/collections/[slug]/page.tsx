import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopView } from "@/components/shop/shop-view";
import { PageHeader } from "@/components/layout/page-header";
import { getCategories, getCategory, getShopProducts } from "@/server/queries";
import { PER_PAGE, parseShopQuery, searchParamsToString, toShopQueryInput, type CollectionKey } from "@/lib/shop-url";

export const revalidate = 60;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Collections are flag-driven (`is_new_arrival` etc.), not a table — the owner
 * toggles a flag on a product and it appears here. Anything that is not a known
 * collection slug is treated as a category slug so old links keep working.
 */
const COLLECTIONS: Record<string, { key: CollectionKey; eyebrow: string; title: string; description: string }> = {
  "new-arrivals": {
    key: "new",
    eyebrow: "Just landed",
    title: "New arrivals",
    description: "The last two weeks of stock, in the sizes the shop actually received. Small lots — when a size goes it usually does not come back this season.",
  },
  "best-sellers": {
    key: "bestsellers",
    eyebrow: "Ranked by the counter",
    title: "Best sellers",
    description: "What has actually left the shop in the last thirty days, not what we would like to sell.",
  },
  featured: {
    key: "featured",
    eyebrow: "Picked by the shop",
    title: "Featured pieces",
    description: "The four or five things we would put in front of a friend walking in today.",
  },
  sale: {
    key: "sale",
    eyebrow: "Reduced",
    title: "On sale",
    description: "End-of-line lots and sample pieces. Priced down because we want the rail clear, not because the cloth is compromised.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const known = COLLECTIONS[slug];
  const category = known ? undefined : getCategory(slug);
  if (!known && !category) return {};
  const title = known?.title ?? `${category!.name} for men`;
  return {
    title,
    description: (known?.description ?? category?.blurb ?? "").slice(0, 158) || `Shop ${title} at Aakash Men's Wear.`,
    alternates: { canonical: `/collections/${slug}` },
  };
}

export default async function CollectionPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: SearchParams }) {
  const { slug } = await params;
  const known = COLLECTIONS[slug];
  const category = known ? undefined : getCategory(slug);
  if (!known && !category) notFound();

  const raw = searchParamsToString(await searchParams);
  const parsed = parseShopQuery(raw);
  const query = known ? { ...parsed, collection: known.key } : { ...parsed, category: slug };

  const { items, total, facets } = getShopProducts(toShopQueryInput(query, PER_PAGE));
  const categories = getCategories();
  const topLevels = categories.filter((entry) => entry.parent_id === null);

  const heading = known
    ? COLLECTIONS[slug]
    : {
        eyebrow: "Category",
        title: category!.name,
        description:
          category!.blurb ||
          "Cut, stitched and checked in-house. Sizes listed are what we keep on the shelf — write to us on WhatsApp if yours is missing and we will usually have it readied in two days.",
      };

  const children = category ? categories.filter((entry) => entry.parent_id === category.id) : [];
  const otherCollections = Object.entries(COLLECTIONS).filter(([key]) => key !== slug);

  return (
    <>
      <PageHeader
        eyebrow={heading.eyebrow}
        title={heading.title}
        description={heading.description}
        breadcrumb={[{ name: "Home", href: "/" }, { name: "Collections", href: "/shop" }, { name: heading.title }]}
        meta={`${total} ${total === 1 ? "piece" : "pieces"}`}
      />

      {children.length > 0 ? (
        <div className="border-b border-line bg-bone">
          <div className="shop-shell flex flex-wrap items-center gap-x-5 gap-y-2 py-3.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">In {category!.name}</span>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {children.map((child) => (
                <li key={child.id}>
                  <a href={`/collections/${child.slug}`} className="link-line text-[13px] text-graphite transition-colors hover:text-ink">
                    {child.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="shop-shell pb-16 pt-8">
        <ShopView
          products={items}
          facets={facets}
          total={total}
          query={{ ...query, perPage: PER_PAGE }}
          basePath={`/collections/${slug}`}
          categories={topLevels.map((entry) => ({ id: entry.id, name: entry.name, slug: entry.slug }))}
          emptyTitle={known ? "This lot is empty right now" : "Nothing in this category yet"}
          emptyText="Pieces move out and the flags are updated from the dashboard. Try the full rail, or ask us what is being cut next."
        />

        <nav aria-label="Other collections" className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-6">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Other collections</span>
          {otherCollections.map(([key, value]) => (
            <a key={key} href={`/collections/${key}`} className="link-line text-[13px] text-graphite transition-colors hover:text-ink">
              {value.title}
            </a>
          ))}
          <a href="/shop" className="link-line text-[13px] text-graphite transition-colors hover:text-ink">
            All products
          </a>
        </nav>
      </div>
    </>
  );
}
