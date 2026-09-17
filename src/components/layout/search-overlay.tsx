"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";
import { IconArrowRight, IconClose, IconSearch } from "@/components/ui/icons";
import type { ProductCard } from "@/server/repositories/types";

type Suggestions = {
  products: ProductCard[];
  categories: { name: string; slug: string }[];
};

/**
 * Global search over name, category, brand and SKU. Results stream in as the
 * visitor types; pressing Enter hands off to the full shop page with the same
 * query, so the overlay is a shortcut and never a dead end.
 */
export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [term, setTerm] = useState("");
  const [data, setData] = useState<Suggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    const value = term.trim();
    if (value.length < 2) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/store/search?q=${encodeURIComponent(value)}`, { credentials: "same-origin" });
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);

  const results = useMemo(() => data?.products ?? [], [data]);
  const cats = useMemo(() => data?.categories ?? [], [data]);
  const trimmed = term.trim();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[75]" role="dialog" aria-modal="true" aria-label="Search products">
      <button type="button" aria-label="Close search" tabIndex={-1} onClick={onClose} className="absolute inset-0 cursor-default bg-ink/40 backdrop-blur-[1px]" />
      <div className="relative mx-auto flex max-h-[92dvh] w-full max-w-[720px] animate-[fade-up_.26s_var(--ease-soft)_both] flex-col overflow-hidden bg-bone shadow-lift sm:mt-[8vh] sm:rounded-[var(--radius-lg)]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (trimmed) {
              onClose();
              router.push(`/shop?q=${encodeURIComponent(trimmed)}`);
            }
          }}
          className="flex items-center gap-3 border-b border-line bg-paper px-4 py-3"
        >
          <IconSearch size={18} className="text-muted" />
          <input
            ref={inputRef}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            type="search"
            placeholder="Search shirts, jeans, kurtas, SKU…"
            aria-label="Search products by name, category, brand or SKU"
            autoComplete="off"
            className="h-9 w-full min-w-0 border-0 bg-transparent text-[15.5px] outline-none placeholder:text-muted/70"
          />
          {loading ? <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-ink" aria-hidden="true" /> : null}
          <button type="button" onClick={onClose} aria-label="Close search" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-sand hover:text-ink">
            <IconClose size={16} />
          </button>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3 sm:px-3">
          {trimmed.length === 0 ? (
            <div className="px-2 py-3">
              <p className="eyebrow">Popular right now</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Linen shirt", "Slim jeans", "Blazer", "Kurta set", "Hoodie", "Chinos", "Merino"].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setTerm(chip)}
                    className="rounded-full border border-line bg-paper px-3 py-1.5 text-[12.5px] text-ink-soft transition-colors hover:border-ink hover:text-ink"
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <p className="mt-5 text-[12.5px] leading-relaxed text-muted">
                Tip: search by SKU (for example <span className="nums font-medium text-ink-soft">AMW-1000</span>) if you are reordering
                something from the shop.
              </p>
            </div>
          ) : null}

          {trimmed.length >= 2 && !loading && results.length === 0 && cats.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <p className="display text-[19px] text-ink">Nothing matched “{trimmed}”</p>
              <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-muted">
                We stock around forty pieces online, but the shop carries more. Try a shorter word like “shirt”, or ask us on WhatsApp and
                we will check the rack for you.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link href="/shop" onClick={onClose} className="h-10 rounded-[var(--radius-sm)] bg-ink px-4 text-[12.5px] font-semibold uppercase tracking-[0.07em] text-bone">
                  Browse the collection
                </Link>
                <Link href="/contact" onClick={onClose} className="h-10 rounded-[var(--radius-sm)] border border-line bg-paper px-4 text-[12.5px] font-medium text-ink">
                  Ask the shop
                </Link>
              </div>
            </div>
          ) : null}

          {failed ? (
            <p className="px-3 py-6 text-center text-[13px] text-bad">
              Search is unavailable right now. Check your connection and try once more.
            </p>
          ) : null}

          {cats.length > 0 ? (
            <div className="mb-2 px-1">
              <p className="eyebrow px-2 pb-1.5">Categories</p>
              <div className="flex flex-wrap gap-1.5">
                {cats.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/collections/${category.slug}`}
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-[12.5px] text-ink transition-colors hover:border-ink"
                  >
                    {category.name}
                    <IconArrowRight size={12} className="text-muted" />
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {results.length > 0 ? (
            <ul className="divide-y divide-line-soft">
              {results.map((product) => (
                <li key={product.id}>
                  <Link href={`/product/${product.slug}`} onClick={onClose} className="group flex items-center gap-3.5 rounded-[var(--radius-sm)] px-2 py-2.5 transition-colors hover:bg-paper">
                    <span className="h-[54px] w-[44px] shrink-0 overflow-hidden rounded-[3px] bg-sand">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={product.image.src} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-ink">{product.name}</span>
                      <span className="mt-0.5 block text-[12px] text-muted">
                        {product.brand} · {product.category?.name}
                        {product.sizes.length ? ` · ${product.sizes.slice(0, 4).join(", ")}` : ""}
                      </span>
                    </span>
                    <span className="nums shrink-0 text-right">
                      <span className="block text-[13px] font-semibold text-ink">{money(product.price)}</span>
                      {product.discountPct > 0 ? <span className="block text-[11px] text-brass-deep">{product.discountPct}% off</span> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {trimmed.length >= 2 && results.length > 0 ? (
          <Link
            href={`/shop?q=${encodeURIComponent(trimmed)}`}
            onClick={onClose}
            className="flex items-center justify-between border-t border-line bg-paper px-4 py-3 text-[12.5px] font-medium text-ink transition-colors hover:bg-sand/70"
          >
            See all results for “{trimmed}”
            <IconArrowRight size={15} />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
