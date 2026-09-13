"use client";

import { useRouter } from "next/navigation";
import { IconClose, IconFilter } from "@/components/ui/icons";
import { COLLECTION_OPTIONS, activeFilterCount, withBase, type ShopQuery } from "@/lib/shop-url";
import { SORT_OPTIONS } from "@/lib/shop-url";
import { cn } from "@/lib/cn";
import type { Facets } from "@/server/repositories/types";

/**
 * Result count, sort and the chips for whatever is currently applied. Chips are
 * the only way to remove a filter on mobile without reopening the sheet, so they
 * stay visible even when the panel is closed.
 */
export function ShopToolbar({
  query,
  basePath,
  total,
  facets,
  onOpenFilters,
  className,
}: {
  query: ShopQuery;
  basePath: string;
  total: number;
  facets: Facets;
  onOpenFilters?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const activeCount = activeFilterCount(query);
  const category = facets.categories.find((bucket) => bucket.slug === query.category);

  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (query.q) chips.push({ key: "q", label: `“${query.q}”`, onRemove: () => router.push(withBase(basePath, { ...query, q: "", page: 1 })) });
  if (query.category && category) chips.push({ key: "category", label: category.name, onRemove: () => router.push(withBase(basePath, { ...query, category: "", page: 1 })) });
  if (query.collection) {
    const label = COLLECTION_OPTIONS.find((option) => option.value === query.collection)?.label ?? query.collection;
    chips.push({ key: "collection", label, onRemove: () => router.push(withBase(basePath, { ...query, collection: "", page: 1 })) });
  }
  for (const size of query.sizes) {
    chips.push({ key: `size-${size}`, label: `Size ${size}`, onRemove: () => router.push(withBase(basePath, { ...query, sizes: query.sizes.filter((entry) => entry !== size), page: 1 })) });
  }
  for (const color of query.colors) {
    chips.push({ key: `color-${color}`, label: color, onRemove: () => router.push(withBase(basePath, { ...query, colors: query.colors.filter((entry) => entry !== color), page: 1 })) });
  }
  if (typeof query.min === "number" || typeof query.max === "number") {
    chips.push({
      key: "price",
      label: `${query.min ? `₹${query.min.toLocaleString("en-IN")}` : "Any"} – ${query.max ? `₹${query.max.toLocaleString("en-IN")}` : "Any"}`,
      onRemove: () => router.push(withBase(basePath, { ...query, min: undefined, max: undefined, page: 1 })),
    });
  }
  if (query.availability === "in_stock") {
    chips.push({ key: "stock", label: "In stock", onRemove: () => router.push(withBase(basePath, { ...query, availability: "all", page: 1 })) });
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <p className="text-[13px] text-muted">
          {total > 0 ? (
            <>
              <span className="nums font-semibold text-ink">{total}</span> {total === 1 ? "piece" : "pieces"}
              {activeCount > 0 ? <span className="hidden sm:inline"> · filtered</span> : null}
            </>
          ) : (
            "No pieces match"
          )}
        </p>

        <div className="flex items-center gap-2">
          {onOpenFilters ? (
            <button
              type="button"
              onClick={onOpenFilters}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-[var(--radius-xs)] border border-line px-3 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:border-ink lg:hidden",
                activeCount > 0 && "border-ink bg-ink text-bone",
              )}
            >
              <IconFilter size={14} />
              Filters
              {activeCount > 0 ? <span className="nums">({activeCount})</span> : null}
            </button>
          ) : null}

          <label className="flex items-center gap-2">
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.1em] text-muted sm:inline">Sort</span>
            <span className="sr-only">Sort products</span>
            <select
              value={query.sort}
              onChange={(event) => router.push(withBase(basePath, { ...query, sort: event.target.value as ShopQuery["sort"], page: 1 }))}
              className="h-9 appearance-none rounded-[var(--radius-xs)] border border-line bg-transparent pl-3 pr-7 text-[12.5px] text-ink transition-colors hover:border-ink focus:border-ink focus:outline-none"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236a6965' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 8px center",
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {chips.length > 0 ? (
        <ul className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <li key={chip.key}>
              <button
                type="button"
                onClick={chip.onRemove}
                className="group inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 text-[12px] text-graphite transition-colors hover:border-ink hover:text-ink"
              >
                {chip.label}
                <IconClose size={11} className="text-muted transition-colors group-hover:text-ink" />
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => router.push(basePath)}
              className="h-7 px-1 text-[12px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-brass-deep"
            >
              Clear all
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
