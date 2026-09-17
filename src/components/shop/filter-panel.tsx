"use client";

import { useRouter } from "next/navigation";
import { Checkbox, Input } from "@/components/ui/field";
import { IconCheck } from "@/components/ui/icons";
import { PRICE_BANDS, toggleValue, withBase, type ShopQuery } from "@/lib/shop-url";
import { formatShortPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Facets } from "@/server/repositories/types";

/**
 * Filtering writes straight to the URL — there is no local copy of the filter
 * state, so refresh, back button and a shared link all behave. Zero-count
 * buckets stay visible but dimmed so the panel does not jump while narrowing.
 */
export function FilterPanel({
  query,
  basePath,
  facets,
  categories,
  className,
  onDone,
  totalLabel = "matching",
}: {
  totalLabel?: string;
  query: ShopQuery;
  basePath: string;
  facets: Facets;
  categories: { id: number; name: string; slug: string }[];
  className?: string;
  /** Inside the mobile sheet the panel fills the body and needs its own CTA. */
  onDone?: () => void;
}) {
  const router = useRouter();

  const apply = (patch: Partial<ShopQuery>) => {
    router.push(withBase(basePath, { ...query, ...patch, page: 1 }));
  };

  return (
    <form
      className={cn("space-y-6", className)}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const min = Number(String(data.get("min") ?? "").replace(/\D/g, "")) || undefined;
        const max = Number(String(data.get("max") ?? "").replace(/\D/g, "")) || undefined;
        apply({ min, max });
      }}
    >
      <FilterGroup title="Category" onClear={query.category ? () => apply({ category: "" }) : undefined}>
        <ul className="space-y-0.5">
          {categories.slice(0, 24).map((category) => {
            const count = facets.categories.find((bucket) => bucket.slug === category.slug)?.count ?? 0;
            const selected = query.category === category.slug;
            return (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => apply({ category: selected ? "" : category.slug })}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-[var(--radius-xs)] px-2 py-1.5 text-left text-[13.5px] transition-colors",
                    selected ? "bg-sand font-medium text-ink" : "text-graphite hover:bg-sand/60 hover:text-ink",
                    count === 0 && !selected ? "opacity-40" : "",
                  )}
                >
                  <span className="truncate">{category.name}</span>
                  <span className="nums shrink-0 text-[11.5px] text-muted">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </FilterGroup>

      <FilterGroup title="Size" onClear={query.sizes.length ? () => apply({ sizes: [] }) : undefined}>
        <div className="flex flex-wrap gap-1.5">
          {facets.sizes.map((size) => {
            const selected = query.sizes.includes(size.label);
            return (
              <button
                key={size.label}
                type="button"
                onClick={() => apply({ sizes: toggleValue(query.sizes, size.label) })}
                disabled={size.count === 0 && !selected}
                className={cn(
                  "nums min-w-[42px] rounded-[var(--radius-xs)] border px-2.5 py-1.5 text-[12px] transition-colors",
                  selected ? "border-ink bg-ink text-bone" : "border-line text-graphite hover:border-ink",
                  size.count === 0 && !selected ? "opacity-40" : "",
                )}
              >
                {size.label}
              </button>
            );
          })}
        </div>
      </FilterGroup>

      <FilterGroup title="Colour" onClear={query.colors.length ? () => apply({ colors: [] }) : undefined}>
        <ul className="space-y-0.5">
          {facets.colors.map((color) => {
            const selected = query.colors.includes(color.name);
            return (
              <li key={color.name}>
                <button
                  type="button"
                  onClick={() => apply({ colors: toggleValue(query.colors, color.name) })}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-[var(--radius-xs)] px-2 py-1.5 text-left transition-colors hover:bg-sand/60",
                    selected && "bg-sand",
                  )}
                >
                  <span
                    className={cn("h-4 w-4 shrink-0 rounded-full border border-[#00000026]", selected && "ring-2 ring-ink ring-offset-1")}
                    style={{ backgroundColor: color.hex ?? "#e8e4dc" }}
                  />
                  <span className="truncate text-[13px] text-graphite">{color.name}</span>
                  <span className="nums ml-auto text-[11px] text-muted">{color.count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </FilterGroup>

      <FilterGroup title="Price">
        <ul className="mb-3 space-y-0.5">
          {PRICE_BANDS.map((band) => {
            const selected = band.min === query.min && band.max === query.max;
            return (
              <li key={band.label}>
                <button
                  type="button"
                  onClick={() => apply({ min: selected ? undefined : band.min, max: selected ? undefined : band.max })}
                  className={cn(
                    "w-full rounded-[var(--radius-xs)] px-2 py-1.5 text-left text-[13.5px] transition-colors",
                    selected ? "bg-sand font-medium text-ink" : "text-graphite hover:bg-sand/60",
                  )}
                >
                  {band.label}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-2">
          <Input name="min" aria-label="Minimum price" inputMode="numeric" placeholder={String(Math.floor(facets.price.min))} prefix="₹" defaultValue={query.min ?? ""} />
          <span className="text-muted">–</span>
          <Input name="max" aria-label="Maximum price" inputMode="numeric" placeholder={String(Math.ceil(facets.price.max))} prefix="₹" defaultValue={query.max ?? ""} />
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <p className="text-[11.5px] text-muted">
            Everything: {formatShortPrice(facets.price.min)} – {formatShortPrice(facets.price.max)}
          </p>
          <button type="submit" className="shrink-0 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-brass-deep">
            Apply
          </button>
        </div>
      </FilterGroup>

      <FilterGroup title="Availability">
        <div className="space-y-1.5">
          <Checkbox
            label={`In stock only${facets.inStock ? ` (${facets.inStock})` : ""}`}
            checked={query.availability === "in_stock"}
            onChange={(event) => apply({ availability: event.target.checked ? "in_stock" : "all" })}
          />
          <Checkbox
            label={`Reduced (${facets.onSale})`}
            checked={query.collection === "sale"}
            onChange={(event) => apply({ collection: event.target.checked ? "sale" : query.collection === "sale" ? "" : query.collection })}
          />
        </div>
      </FilterGroup>

      {onDone ? (
        <button
          type="button"
          onClick={onDone}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-ink text-[12px] font-semibold uppercase tracking-[0.1em] text-bone transition-colors hover:bg-ink-soft"
        >
          <IconCheck size={14} /> Show {totalLabel} results
        </button>
      ) : null}
    </form>
  );
}

function FilterGroup({ title, onClear, children }: { title: string; onClear?: () => void; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="border-b border-line pb-5 last:border-b-0 last:pb-0">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">{title}</h3>
        {onClear ? (
          <button type="button" onClick={onClear} className="text-[11px] text-muted transition-colors hover:text-brass-deep">
            Reset
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}
