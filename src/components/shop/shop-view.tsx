"use client";

import { useState } from "react";
import Link from "next/link";
import { ShopToolbar } from "@/components/shop/shop-toolbar";
import { FilterPanel } from "@/components/shop/filter-panel";
import { ProductCard } from "@/components/shop/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button, LinkButton } from "@/components/ui/button";
import { IconClose, IconSearch } from "@/components/ui/icons";
import { Sheet } from "@/components/ui/sheet";
import { useRouter } from "next/navigation";
import { PER_PAGE, activeFilterCount, withBase, type ShopQuery } from "@/lib/shop-url";
import type { Facets, ProductCard as ProductCardType } from "@/server/repositories/types";
import { cn } from "@/lib/cn";

/**
 * One list surface for /shop, /collections/*, /offers and search results: the
 * differences between those pages are the heading and the pre-applied filter,
 * not the machinery. Filters live in the URL, so this component is stateless
 * apart from the mobile sheet.
 */
export function ShopView({
  products,
  facets,
  total,
  query,
  basePath,
  categories,
  emptyTitle = "No pieces match those filters",
  emptyText = "Try removing a filter or two — the catalogue is small and specific, so a narrow combination can come up empty.",
}: {
  products: ProductCardType[];
  facets: Facets;
  total: number;
  query: ShopQuery;
  basePath: string;
  categories: { id: number; name: string; slug: string }[];
  emptyTitle?: string;
  emptyText?: string;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasFilters = activeFilterCount(query) > 0;

  return (
    <>
      <ShopToolbar
        query={query}
        basePath={basePath}
        total={total}
        facets={facets}
        onOpenFilters={() => setFiltersOpen(true)}
      />

      <div className="mt-7 grid items-start gap-10 lg:grid-cols-[224px_1fr]">
        <aside className="sticky top-[100px] hidden lg:block">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">Refine</p>
            {hasFilters ? <ClearAll basePath={basePath} query={query} /> : null}
          </div>
          <FilterPanel query={query} basePath={basePath} facets={facets} categories={categories} />
        </aside>

        <div className={cn(products.length === 0 && "min-h-[360px]")}>
          {products.length > 0 ? (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 xl:grid-cols-4">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} compact priority={index < 4} />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<IconSearch size={22} />}
              title={emptyTitle}
              description={emptyText}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <ClearAll basePath={basePath} query={query} asButton />
                  <LinkButton href="/collections/new-arrivals" variant="outline" size="sm">
                    See what is new
                  </LinkButton>
                  <LinkButton href="/contact" variant="link" size="sm">
                    Ask us to source it
                  </LinkButton>
                </div>
              }
            />
          )}

          <ShopPagination total={total} query={query} basePath={basePath} />
        </div>
      </div>

      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        side="left"
        title="Refine"
        description={`${total} ${total === 1 ? "piece" : "pieces"} in view`}
      >
        <FilterPanel
          query={query}
          basePath={basePath}
          facets={facets}
          categories={categories}
          onDone={() => setFiltersOpen(false)}
          totalLabel={String(total)}
        />
      </Sheet>
    </>
  );
}

function ClearAll({ basePath, query, asButton = false }: { basePath: string; query: ShopQuery; asButton?: boolean }) {
  const router = useRouter();
  const label = (
    <>
      <IconClose size={asButton ? 13 : 11} /> Clear filters
    </>
  );
  if (asButton) {
    return (
      <Button variant="light" size="sm" onClick={() => router.push(withBase(basePath, { ...query, category: "", sizes: [], colors: [], min: undefined, max: undefined, availability: "all", collection: "", page: 1 }))}>
        {label}
      </Button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => router.push(withBase(basePath, { ...query, category: "", sizes: [], colors: [], min: undefined, max: undefined, availability: "all", collection: "", page: 1 }))}
      className="inline-flex items-center gap-1 text-[11.5px] text-muted transition-colors hover:text-brass-deep"
    >
      {label}
    </button>
  );
}

/**
 * Numbered pagination instead of infinite scroll: shoppers comparing shirts want
 * the back button to work, and a "load more" link is the fallback when JS is off.
 */
function ShopPagination({ total, query, basePath }: { total: number; query: ShopQuery; basePath: string }) {
  const perPage = query.perPage ?? PER_PAGE;
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;

  const window: number[] = [];
  for (let page = 1; page <= pages; page += 1) {
    if (page <= 2 || page > pages - 2 || Math.abs(page - query.page) <= 1) window.push(page);
  }

  return (
    <nav className="mt-12 flex items-center justify-center gap-1.5" aria-label="More products">
      {query.page > 1 ? (
        <Link
          href={withBase(basePath, { ...query, page: query.page - 1 })}
          className="h-9 rounded-[var(--radius-xs)] border border-line px-3 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:border-ink"
        >
          Previous
        </Link>
      ) : null}
      {window.map((page, index) => (
        <span key={page} className="flex items-center">
          {index > 0 && page - window[index - 1] > 1 ? <span className="px-1 text-muted">…</span> : null}
          <Link
            href={page === 1 ? withBase(basePath, { ...query, page: undefined }) : withBase(basePath, { ...query, page })}
            aria-current={page === query.page ? "page" : undefined}
            className={cn(
              "nums grid h-9 min-w-9 place-items-center rounded-[var(--radius-xs)] px-2 text-[13px] transition-colors",
              page === query.page ? "bg-ink text-bone" : "border border-line text-ink hover:border-ink",
            )}
          >
            {page}
          </Link>
        </span>
      ))}
      {query.page < pages ? (
        <Link
          href={withBase(basePath, { ...query, page: query.page + 1 })}
          className="h-9 rounded-[var(--radius-xs)] border border-line px-3 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:border-ink"
        >
          Next
        </Link>
      ) : null}
    </nav>
  );
}
