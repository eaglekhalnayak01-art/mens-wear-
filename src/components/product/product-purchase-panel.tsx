"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { IconAlert, IconMinus, IconPlus, IconRuler, IconTruck, IconWhatsapp } from "@/components/ui/icons";
import { Price } from "@/components/ui/price";
import { Stars } from "@/components/ui/stars";
import { SizeGuide } from "@/components/product/size-guide";
import { money, waLink } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ProductDetail } from "@/server/repositories/types";
import type { Selection } from "@/components/product/use-variant-selection";

/**
 * The purchase surface: price, variant picking, quantity, honest stock numbers
 * and the two calls to action. Nothing here asks anyone to sign in, and every
 * "why should I trust this" line sits under the buttons, where the decision is
 * actually made.
 */
export function PurchasePanel({
  product,
  selection,
  whatsapp,
  guideOpen,
  onOpenGuide,
  onAdd,
  onBuyNow,
  settings,
}: {
  product: ProductDetail;
  selection: Selection;
  whatsapp: string;
  guideOpen: boolean;
  onOpenGuide: (open: boolean) => void;
  onAdd: () => void;
  onBuyNow: () => void;
  settings: {
    dispatchDays: number;
    deliveryDaysMin: number;
    deliveryDaysMax: number;
    returnWindowDays: number;
    freeDeliveryOver: number;
    codEnabled: boolean;
  };
}) {
  const sizeRef = useRef<HTMLDivElement>(null);
  const { colours, sizeRows, color, size, qty, error, setError, setColor, setSize, setQty, variant, low, soldOut, quantityCap } = selection;

  const enquiry = waLink(
    whatsapp,
    `Hello, I'm looking at "${product.name}"${product.sku ? ` (${product.sku})` : ""}${size ? ` in size ${size}` : ""}${color ? `, ${color}` : ""}. Is it available?`,
  );

  const chooseSize = (label: string, stock: number) => {
    if (stock <= 0) {
      setSize(label);
      setError(`${label} is sold out in ${color?.toLowerCase() ?? "this colour"}. Pick another colour, or ask us when the next lot arrives.`);
      return;
    }
    if (error) setError(null);
    setSize(label);
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Price price={product.price} compareAtPrice={product.compareAtPrice} size="lg" showSave />
        {product.discountPct > 0 ? <Badge tone="brass">{product.discountPct}% off this lot</Badge> : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        {product.brand ? <p className="text-[11.5px] uppercase tracking-[0.12em] text-muted">{product.brand}</p> : null}
        {product.rating && product.ratingCount > 0 ? (
          <p className="flex items-center gap-1.5 text-[12.5px] text-graphite">
            <Stars value={product.rating} size={12} />
            <span className="nums">
              {product.rating.toFixed(1)} · {product.ratingCount} {product.ratingCount === 1 ? "review" : "reviews"}
            </span>
          </p>
        ) : null}
        {product.sku ? <p className="nums text-[12px] text-muted">SKU {product.sku}</p> : null}
      </div>

      {product.description ? <p className="mt-5 max-w-[56ch] text-[14.5px] leading-[1.75] text-graphite">{product.description}</p> : null}

      {colours.length > 1 ? (
        <fieldset className="mt-7">
          <legend className="mb-2.5 flex w-full items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">Colour</span>
            <span className="text-[12.5px] text-muted">{color}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {colours.map((entry) => (
              <button
                key={entry.name}
                type="button"
                onClick={() => setColor(entry.name)}
                aria-pressed={color === entry.name}
                className={cn(
                  "relative flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border px-2.5 text-[12.5px] transition-colors",
                  color === entry.name ? "border-ink bg-ink text-bone" : "border-line text-graphite hover:border-ink",
                  !entry.inStock && "opacity-55",
                )}
              >
                <span
                  className="h-[18px] w-[18px] rounded-full border border-[#00000026]"
                  style={{ backgroundColor: entry.hex ?? "#e8e4dc" }}
                  aria-hidden="true"
                />
                {entry.name}
                {!entry.inStock ? <span className="absolute inset-x-1.5 top-1/2 h-px -rotate-[20deg] bg-current opacity-60" aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="mt-7" ref={sizeRef}>
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">
            {sizeRows.length > 0 ? "Size" : "One size"}
          </p>
          <button type="button" onClick={() => onOpenGuide(true)} className="inline-flex items-center gap-1.5 text-[12px] text-brass-deep transition-colors hover:text-ink">
            <IconRuler size={14} /> Size guide
          </button>
        </div>

        {sizeRows.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {sizeRows.map((row) => (
              <button
                key={row.label}
                type="button"
                onClick={() => chooseSize(row.label, row.stock)}
                aria-pressed={size === row.label}
                className={cn(
                  "nums relative min-w-[54px] rounded-[var(--radius-sm)] border px-3 py-2.5 text-[13px] transition-colors",
                  size === row.label ? "border-ink bg-ink text-bone" : "border-line text-ink hover:border-ink",
                  row.stock === 0 ? "text-muted" : "",
                )}
              >
                {row.label}
                {row.stock === 0 ? <span className="pointer-events-none absolute inset-x-2 top-1/2 h-px bg-current opacity-45" aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[13.5px] text-muted">This piece is cut one way only — the measurements are in the details below.</p>
        )}
      </div>

      {variant && variant.stock > 0 ? (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center rounded-[var(--radius-sm)] border border-line">
            <button
              type="button"
              onClick={() => setQty(Math.max(1, qty - 1))}
              disabled={qty <= 1}
              aria-label="Reduce quantity"
              className="grid h-11 w-11 place-items-center text-ink transition-colors hover:bg-sand disabled:opacity-30"
            >
              <IconMinus size={15} />
            </button>
            <span className="nums w-9 text-center text-[14px] font-semibold" aria-live="polite">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty(Math.min(quantityCap, qty + 1))}
              disabled={qty >= quantityCap}
              aria-label="Increase quantity"
              className="grid h-11 w-11 place-items-center text-ink transition-colors hover:bg-sand disabled:opacity-30"
            >
              <IconPlus size={15} />
            </button>
          </div>
          <p className={cn("text-[12.5px]", low ? "text-warn" : "text-muted")}>
            {low ? (
              <span className="inline-flex items-center gap-1.5">
                <IconAlert size={13} /> Low stock — only {variant.stock} {variant.stock === 1 ? "piece" : "pieces"} left in {size}
              </span>
            ) : (
              `${variant.stock} in stock in ${size}`
            )}
          </p>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-bad/25 bg-bad-tint px-3.5 py-2.5 text-[13px] leading-relaxed text-bad">
          <IconAlert size={15} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}

      {soldOut ? (
        <div className="mt-7 rounded-[var(--radius-md)] border border-line bg-paper p-4">
          <p className="text-[14px] font-semibold text-ink">Sold out in every size</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            This lot finished. The same cloth is usually back on the rail in six weeks — message us and we will tell you the date and keep one aside.
          </p>
          <a
            href={enquiry}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-3.5 inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] bg-ink px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-bone transition-colors hover:bg-ink-soft"
          >
            <IconWhatsapp size={15} /> Ask about the next lot
          </a>
        </div>
      ) : (
        <div className="mt-7 space-y-2.5">
          <div className="flex gap-2.5">
            <Button variant="solid" size="lg" fullWidth onClick={onAdd}>
              Add to cart
            </Button>
            <Button variant="brass" size="lg" fullWidth onClick={onBuyNow}>
              Buy now
            </Button>
          </div>
          <a
            href={enquiry}
            target="_blank"
            rel="noreferrer noopener"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-line text-[12px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:border-ink"
          >
            <IconWhatsapp size={15} /> Ask us about this piece
          </a>
          <p className="pt-0.5 text-[12.5px] text-muted">
            {qty > 1 && variant ? `${qty} pieces · ${money(variant.price * qty)} total — ` : ""}
            {product.price * Math.max(1, qty) >= settings.freeDeliveryOver
              ? "This order ships free."
              : `Spend ${money(settings.freeDeliveryOver - product.price * Math.max(1, qty))} more for free delivery.`}
          </p>
        </div>
      )}

      <dl className="mt-8 grid gap-x-6 gap-y-4 border-t border-line pt-6 text-[13px] sm:grid-cols-2">
        <PanelFact
          term="Dispatch"
          detail={`Packed and handed to the courier within ${settings.dispatchDays} working day${settings.dispatchDays > 1 ? "s" : ""}`}
        />
        <PanelFact term="Delivery" detail={`${settings.deliveryDaysMin}–${settings.deliveryDaysMax} days after dispatch, tracked`} />
        <PanelFact
          term="Cash on delivery"
          detail={settings.codEnabled ? "Available, no handling fee. Keep the exact amount ready." : "Online payment only for this order"}
        />
        <PanelFact term="Exchange" detail={`${settings.returnWindowDays}-day size exchange, first courier leg on us`} />
      </dl>

      <p className="mt-4 inline-flex items-center gap-2 text-[12.5px] text-muted">
        <IconTruck size={14} className="text-brass" />
        Free hemming and waist adjustment on suiting and ethnic wear — mention it in the order notes.
      </p>

      <Dialog open={guideOpen} onClose={() => onOpenGuide(false)} title="Size guide" description="Body measurements in inches">
        <SizeGuide category={product.category?.slug ?? ""} subCategory={product.subCategory} />
      </Dialog>
    </div>
  );
}

function PanelFact({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-[86px] shrink-0 text-muted">{term}</dt>
      <dd className="max-w-[34ch] text-ink-soft">{detail}</dd>
    </div>
  );
}
