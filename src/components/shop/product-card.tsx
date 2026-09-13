"use client";

import Link from "next/link";
import { useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { IconBag, IconCheck } from "@/components/ui/icons";
import { useCart } from "@/components/cart/cart-provider";
import { useToast } from "@/components/ui/toast";
import { discountPercent } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ProductCard as ProductCardType } from "@/server/repositories/types";

/**
 * The storefront's workhorse card. One image, four facts, two actions.
 * Hover behaviour is desktop-only and restrained: a slow zoom, a second frame,
 * and the actions sliding up — nothing that jumps or loops.
 */
export function ProductCard({ product, priority = false, compact = false }: { product: ProductCardType; priority?: boolean; compact?: boolean }) {
  const { add } = useCart();
  const toast = useToast();
  const [added, setAdded] = useState(false);
  const off = product.discountPct || discountPercent(product.price, product.compareAtPrice);
  const soldOut = !product.inStock;
  const cardLabel = [product.name, off > 0 ? `${off}% off` : null, soldOut ? "sold out" : "view product"]
    .filter(Boolean)
    .join(", ");

  const quickAdd = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!product.quickAdd) return;
    add(
      {
        variantId: product.quickAdd.variantId,
        productId: product.id,
        name: product.name,
        slug: product.slug,
        size: product.quickAdd.size,
        color: product.quickAdd.color,
        unitPrice: product.price,
        compareAtPrice: product.compareAtPrice,
        image: product.image.src,
        sku: null,
      },
      1,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
    toast.push({
      title: "Added to cart",
      description: product.quickAdd.size ? `${product.name} · Size ${product.quickAdd.size}` : product.name,
      tone: "good",
    });
  };

  return (
    <article className={cn("group relative flex flex-col", compact ? "gap-2" : "gap-2.5")}>
      <Link
        href={`/product/${product.slug}`}
        className="relative block overflow-hidden rounded-[var(--radius-xs)] bg-sand focus-visible:outline-offset-4"
        aria-label={cardLabel}
      >
        <SafeImage
          src={product.image.src}
          alt={product.image.alt}
          className={cn("aspect-[4/5] w-full transition-transform duration-[650ms] ease-[cubic-bezier(.22,.61,.36,1)] group-hover:scale-[1.025]", soldOut && "opacity-[0.72] saturate-[0.65]")}
          sizes={compact ? "(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 22vw" : "(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 23vw"}
          priority={priority}
        />
        {product.hoverImage ? (
          <SafeImage
            src={product.hoverImage.src}
            alt=""
            className="pointer-events-none absolute inset-0 aspect-[4/5] w-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            sizes="(max-width: 640px) 46vw, 23vw"
          />
        ) : null}

        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1.5">
          {product.isNewArrival ? <Badge tone="ink">New</Badge> : null}
          {off > 0 ? <Badge tone="brass">{off}% off</Badge> : null}
        </div>

        {soldOut ? (
          <div className="absolute inset-x-0 bottom-0 flex justify-center bg-bone/92 py-2 backdrop-blur-[2px]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Sold out</span>
          </div>
        ) : null}

        {/* Desktop-only actions; touch users get the row under the card. */}
        {!soldOut && !compact ? (
          <div className="pointer-events-none absolute inset-x-2 bottom-2 hidden translate-y-2 gap-1.5 opacity-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(.22,.61,.36,1)] group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 md:flex">
            <button
              type="button"
              onClick={quickAdd}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-ink/92 text-[11px] font-semibold uppercase tracking-[0.08em] text-bone backdrop-blur transition-colors hover:bg-ink"
            >
              {added ? <IconCheck size={13} /> : <IconBag size={13} />}
              {added ? "Added" : "Add to cart"}
            </button>
            <span className="hidden h-9 items-center rounded-[var(--radius-sm)] bg-paper/95 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink backdrop-blur lg:inline-flex">
              View
            </span>
          </div>
        ) : null}
      </Link>

      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          {product.brand ? <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">{product.brand}</p> : null}
          <h3 className={cn("mt-0.5 truncate font-sans text-[13.5px] font-medium leading-snug text-ink", compact && "text-[12.5px]")}>
            <Link href={`/product/${product.slug}`} className="transition-colors hover:text-ink-soft">
              {product.name}
            </Link>
          </h3>
        </div>
        {product.colors.length > 0 ? (
          <span className="mt-1 flex shrink-0 items-center gap-1" title={product.colors.map((c) => c.name).join(", ")}>
            {product.colors.slice(0, 3).map((color) => (
              <span key={color.name} className="h-[9px] w-[9px] rounded-full border border-ink/15" style={{ background: color.hex }} aria-label={color.name} />
            ))}
            {product.colors.length > 3 ? <span className="text-[10px] text-muted">+{product.colors.length - 3}</span> : null}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <Price price={product.price} compareAtPrice={product.compareAtPrice} size={compact ? "sm" : "md"} />
        {product.sizes.length > 0 ? (
          <p className={cn("nums text-[11px] tracking-[0.02em] text-muted", compact && "hidden")}>
            {product.sizes.slice(0, 5).join(" · ")}
            {product.sizes.length > 5 ? ` +${product.sizes.length - 5}` : ""}
          </p>
        ) : null}
      </div>

      {/* Touch-friendly actions live under the card instead of on hover. */}
      {!compact ? (
        <div className="mt-0.5 flex gap-1.5 md:hidden">
          {soldOut ? (
            <span className="flex h-9 flex-1 items-center justify-center rounded-[var(--radius-sm)] border border-line bg-paper text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Out of stock
            </span>
          ) : (
            <button
              type="button"
              onClick={quickAdd}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-ink text-[11px] font-semibold uppercase tracking-[0.08em] text-bone active:opacity-85"
            >
              {added ? <IconCheck size={13} /> : <IconBag size={13} />}
              {added ? "Added" : "Add to cart"}
            </button>
          )}
          <Link href={`/product/${product.slug}`} className="flex h-9 items-center justify-center rounded-[var(--radius-sm)] border border-line bg-paper px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
            View product
          </Link>
        </div>
      ) : null}
    </article>
  );
}
