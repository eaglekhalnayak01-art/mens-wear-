"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/shop/product-card";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import type { ProductCard as ProductCardType } from "@/server/repositories/types";
import { cn } from "@/lib/cn";

/**
 * Horizontal rail with rank numbers — the "trending" slot. Scroll buttons only
 * appear when there is something to scroll, and the row is swipe-native on
 * touch, so no JS is wasted on mobile.
 */
export function TrendingRail({ products }: { products: ProductCardType[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    setEdge({
      start: node.scrollLeft <= 4,
      end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    measure();
    const node = ref.current;
    if (!node) return;
    node.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      node.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const scrollBy = (direction: -1 | 1) => {
    const node = ref.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(280, node.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <div className="relative">
      <ul ref={ref} className="rail-scroll no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {products.map((product, index) => (
          <li key={product.id} className="relative w-[46vw] max-w-[268px] shrink-0 sm:w-[38vw] lg:w-[24%]">
            <span className="nums absolute -top-1 left-0 z-10 font-display text-[30px] leading-none text-ink/12 sm:-left-1 sm:text-[38px]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <ProductCard product={product} compact />
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Scroll to previous pieces"
          disabled={edge.start}
          className={cn("grid h-9 w-9 place-items-center rounded-full border border-line bg-paper text-ink transition-all hover:border-ink disabled:opacity-30")}
        >
          <IconChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Scroll to more pieces"
          disabled={edge.end}
          className={cn("grid h-9 w-9 place-items-center rounded-full border border-line bg-paper text-ink transition-all hover:border-ink disabled:opacity-30")}
        >
          <IconChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
