"use client";

import { useEffect, useRef, useState } from "react";
import { Gallery } from "@/components/product/gallery";
import { PurchasePanel } from "@/components/product/product-purchase-panel";
import { SpecsAccordion } from "@/components/product/specs-accordion";
import { useToast } from "@/components/ui/toast";
import { useCart } from "@/components/cart/cart-provider";
import { cartItemFor, useVariantSelection } from "@/components/product/use-variant-selection";
import { Price } from "@/components/ui/price";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ProductDetail as Product } from "@/server/repositories/types";
import type { Settings } from "@/server/repositories/settings.repository";

/**
 * Client shell for the product page. It owns selection state (shared by the
 * panel and the sticky mobile bar) and nothing else — the gallery, the specs and
 * the related rail are independent, so the page stays readable as a file.
 */
export function ProductDetail({
  product,
  settings,
  related,
  onlineAvailable = settings.onlineEnabled,
}: {
  product: Product;
  settings: Settings;
  related: React.ReactNode;
  /** Server-side truth about whether an online method can actually be taken today. */
  onlineAvailable?: boolean;
}) {
  const selection = useVariantSelection(product);
  const { add } = useCart();
  const { push } = useToast();
  const [guideOpen, setGuideOpen] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const sentinel = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => setBarVisible(!entries[0]?.isIntersecting), { rootMargin: "-120px 0px 0px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const commit = (thenCheckout: boolean) => {
    const { variant, setError, size } = selection;
    if (selection.soldOut) return;
    if (!size) {
      setError("Choose a size first — the rail shows what is on the shelf today.");
      document.getElementById("size-group")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!variant || variant.stock <= 0) {
      setError(`Size ${size}${selection.color ? ` in ${selection.color.toLowerCase()}` : ""} is out of stock right now. Message us and we will tell you when it lands.`);
      return;
    }
    const item = cartItemFor(product, selection);
    if (!item) return;
    add(item, selection.qty);
    if (thenCheckout) window.location.assign("/checkout");
    else push({ tone: "good", title: "Added to cart", description: `${product.name}${size ? ` · ${size}` : ""}${selection.color ? ` · ${selection.color}` : ""}` });
  };

  const focusSizes = () => {
    const group = document.getElementById("size-group");
    if (!group) return;
    group.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => group.querySelector<HTMLButtonElement>("button")?.focus(), 420);
  };

  return (
    <>
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,46%)] lg:items-start lg:gap-14">
      <Gallery
        images={product.gallery.length > 0 ? product.gallery : [product.image].filter(Boolean)}
        alt={`${product.name} — Mens Wear`}
        badges={
          <>
            {product.isNewArrival ? <Badge tone="ink">New</Badge> : null}
            {product.discountPct > 0 ? <Badge tone="bad">−{product.discountPct}%</Badge> : null}
            {product.isBestseller ? <Badge tone="brass">Best seller</Badge> : null}
          </>
        }
      />

      <div>
        <PurchasePanel
          product={product}
          selection={selection}
          whatsapp={settings.whatsapp}
          guideOpen={guideOpen}
          onOpenGuide={setGuideOpen}
          onAdd={() => commit(false)}
          onBuyNow={() => commit(true)}
          settings={{
            dispatchDays: settings.dispatchDays,
            deliveryDaysMin: settings.deliveryDaysMin,
            deliveryDaysMax: settings.deliveryDaysMax,
            returnWindowDays: settings.returnWindowDays,
            freeDeliveryOver: settings.freeDeliveryOver,
            codEnabled: settings.codEnabled,
            onlineEnabled: onlineAvailable,
          }}
        />
        <span ref={sentinel} aria-hidden="true" className="block h-px" />
        <SpecsAccordion product={product} />
      </div>

      {/* Sticky mobile buy bar: the desktop CTA is in the panel, phones need it pinned. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bone/95 px-4 py-3 backdrop-blur transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] lg:hidden",
          barVisible ? "translate-y-0" : "translate-y-full",
        )}
        aria-hidden={!barVisible}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium text-ink">{product.name}</p>
            <Price price={product.price} compareAtPrice={product.compareAtPrice} size="sm" />
          </div>
          {selection.soldOut ? (
            <a
              href={`https://wa.me/${settings.whatsapp}`}
              target="_blank"
              rel="noreferrer noopener"
              className="h-10 shrink-0 rounded-[var(--radius-sm)] bg-ink px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-bone"
            >
              Ask us
            </a>
          ) : !selection.size ? (
            <button
              type="button"
              onClick={focusSizes}
              className="h-10 shrink-0 rounded-[var(--radius-sm)] border border-ink bg-transparent px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink"
            >
              Choose size
            </button>
          ) : (
            <button
              type="button"
              onClick={() => commit(false)}
              className="h-10 shrink-0 rounded-[var(--radius-sm)] bg-ink px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-bone"
            >
              Add · {formatPrice(product.price)}
            </button>
          )}
        </div>
      </div>

    </div>
    {related}
    </>
  );
}
