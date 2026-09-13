"use client";

import Link from "next/link";
import { IconButton, LinkButton } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { Price } from "@/components/ui/price";
import { EmptyState } from "@/components/ui/empty-state";
import { IconAlert, IconBag, IconMinus, IconPlus, IconReturn, IconShield, IconTruck } from "@/components/ui/icons";
import { ProductGrid } from "@/components/shop/product-grid";
import { useCart } from "@/components/cart/cart-provider";
import { formatPrice, money } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ProductCard } from "@/server/repositories/types";

export type CartPageSettings = {
  shopName: string;
  deliveryFee: number;
  freeDeliveryOver: number;
  minOrderValue: number;
  codFee: number;
  codEnabled: boolean;
  dispatchDays: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  returnWindowDays: number;
};

/**
 * Full cart page. Kept deliberately plain: rows, a totals block and two exits.
 * Prices here are the server's quote, so they are the numbers checkout will use.
 */
export function CartPage({ settings, suggestions }: { settings: CartPageSettings; suggestions: ProductCard[] }) {
  const { items, totals, ready, syncing, setQty, remove, clear } = useCart();

  if (!ready) {
    return (
      <div className="shop-shell py-14">
        <EmptyState icon={<IconBag size={22} />} title="Reading your bag…" description="One moment while we check prices and stock with the shop." />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <div className="shop-shell py-14">
          <EmptyState
            icon={<IconBag size={22} />}
            title="Your bag is empty"
            description="Nothing here yet. The rail is short and specific — start with what is new, or what other men are taking this month."
            action={
              <div className="flex flex-wrap justify-center gap-2.5">
                <LinkButton href="/shop" size="md" variant="solid">
                  Shop the rail
                </LinkButton>
                <LinkButton href="/collections/new-arrivals" size="md" variant="outline">
                  See new arrivals
                </LinkButton>
              </div>
            }
          />
        </div>
        {suggestions.length > 0 ? (
          <section aria-label="Suggested pieces" className="border-t border-line bg-paper py-12">
            <div className="shop-shell">
              <h2 className="mb-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink">Men are taking these</h2>
              <ProductGrid products={suggestions} columns={4} compact />
            </div>
          </section>
        ) : null}
      </>
    );
  }

  const shortfall = settings.minOrderValue - (totals.subtotal ?? 0);
  const gap = totals.freeShippingGap ?? 0;
  const progress = settings.freeDeliveryOver > 0 ? Math.min(100, ((totals.subtotal ?? 0) / settings.freeDeliveryOver) * 100) : 100;

  return (
    <div className="shop-shell py-9 md:py-12">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">{items.length} {items.length === 1 ? "piece" : "pieces"}</p>
          <h1 className="font-display text-[clamp(1.9rem,1.4rem+1.6vw,2.8rem)] leading-[1.06] text-ink">Your bag</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className={cn("text-[12px] transition-opacity", syncing ? "text-muted opacity-100" : "opacity-0")} aria-live="polite">
            Checking prices…
          </span>
          <button type="button" onClick={clear} className="text-[12.5px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-bad">
            Empty bag
          </button>
        </div>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] lg:gap-10">
        <ul className="divide-y divide-line border-y border-line">
          {items.map((item) => {
            const overStock = item.availableStock !== undefined && item.qty > item.availableStock;
            return (
              <li key={item.variantId} className="flex gap-4 py-5">
                <Link href={`/product/${item.slug}`} className="shrink-0">
                  <SafeImage src={item.image} alt={item.name} className="h-[124px] w-[98px] rounded-[var(--radius-xs)] sm:h-[136px] sm:w-[108px]" sizes="108px" />
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={`/product/${item.slug}`} className="text-[14.5px] font-medium leading-snug text-ink transition-colors hover:text-brass-deep">
                        {item.name}
                      </Link>
                      <p className="mt-1 text-[12.5px] text-muted">
                        {item.size ? `Size ${item.size}` : "One size"}
                        {item.color ? ` · ${item.color}` : ""}
                        {item.sku ? <span className="nums hidden sm:inline"> · {item.sku}</span> : null}
                      </p>
                    </div>
                    <IconButton label={`Remove ${item.name}`} onClick={() => remove(item.variantId)} className="h-8 w-8 border-transparent bg-transparent hover:bg-sand">
                      <span aria-hidden="true" className="text-[17px] leading-none">×</span>
                    </IconButton>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center rounded-[var(--radius-sm)] border border-line">
                      <button
                        type="button"
                        onClick={() => setQty(item.variantId, item.qty - 1)}
                        aria-label={`Reduce quantity of ${item.name}`}
                        className="grid h-9 w-9 place-items-center text-ink transition-colors hover:bg-sand"
                      >
                        <IconMinus size={14} />
                      </button>
                      <span className="nums w-8 text-center text-[13.5px] font-medium" aria-live="polite">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(item.variantId, item.qty + 1)}
                        disabled={item.availableStock !== undefined && item.qty >= Math.min(10, item.availableStock)}
                        aria-label={`Increase quantity of ${item.name}`}
                        className="grid h-9 w-9 place-items-center text-ink transition-colors hover:bg-sand disabled:opacity-30"
                      >
                        <IconPlus size={14} />
                      </button>
                    </div>

                    <div className="text-right">
                      <Price price={item.unitPrice * item.qty} compareAtPrice={item.compareAtPrice ? item.compareAtPrice * item.qty : null} size="md" />
                      {item.compareAtPrice ? (
                        <p className="nums mt-0.5 text-[11.5px] text-muted">{formatPrice(item.unitPrice)} each</p>
                      ) : null}
                    </div>
                  </div>

                  {item.availableStock !== undefined && item.availableStock <= 3 && !overStock ? (
                    <p className="mt-2.5 text-[12px] text-warn">Only {item.availableStock} left in this size.</p>
                  ) : null}
                  {overStock ? (
                    <p className="mt-2.5 text-[12px] text-bad">
                      Only {item.availableStock} available — reduce the quantity to {item.availableStock} to check out.
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="lg:sticky lg:top-[104px]">
          <div className="card-surface p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">Summary</h2>

            {settings.freeDeliveryOver > 0 ? (
              <div className="mt-4 rounded-[var(--radius-sm)] bg-sand/70 p-3">
                <p className="text-[12.5px] leading-snug text-graphite">
                  {gap > 0 ? (
                    <>
                      Add <strong className="font-semibold text-ink">{money(gap)}</strong> more for free delivery.
                    </>
                  ) : (
                    <span className="text-good">Free delivery on this order.</span>
                  )}
                </p>
                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-mist">
                  <div className="h-full rounded-full bg-ink transition-[width] duration-500 ease-[cubic-bezier(.22,.61,.36,1)]" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : null}

            <dl className="mt-4 space-y-2.5 text-[13.5px]">
              <Line term="Subtotal" value={money(totals.subtotal ?? 0)} />
              {totals.discount > 0 ? <Line term="Discount" value={`− ${money(totals.discount)}`} tone="good" /> : null}
              <Line term="Delivery" value={(totals.shipping ?? 0) === 0 ? "Free" : money(totals.shipping ?? 0)} />
              {settings.codFee > 0 && settings.codEnabled ? <Line term="COD handling" value={money(settings.codFee)} /> : null}
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink">Total</dt>
                <dd className="nums font-display text-[22px] leading-none text-ink">{money(totals.total ?? 0)}</dd>
              </div>
            </dl>

            <p className="mt-2 text-[11.5px] text-muted">Taxes included. Free delivery over {money(settings.freeDeliveryOver)}.</p>

            <div className="mt-5 space-y-2.5">
              <LinkButton href="/checkout" size="lg" fullWidth variant="solid">
                Checkout
              </LinkButton>
              <LinkButton href="/shop" size="md" fullWidth variant="light">
                Keep shopping
              </LinkButton>
            </div>

            {shortfall > 0 ? (
              <p className="mt-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-warn/30 bg-warn-tint px-3 py-2.5 text-[12px] leading-relaxed text-warn">
                <IconAlert size={14} className="mt-0.5 shrink-0" />
                Our minimum order is {money(settings.minOrderValue)}. Add {money(shortfall)} more to check out.
              </p>
            ) : null}
          </div>

          <ul className="mt-4 space-y-2.5 text-[12.5px] text-muted">
            <li className="flex items-start gap-2">
              <IconTruck size={14} className="mt-0.5 shrink-0 text-brass" />
              Packed in {settings.dispatchDays} working days, then {settings.deliveryDaysMin}–{settings.deliveryDaysMax} days to your PIN.
            </li>
            <li className="flex items-start gap-2">
              <IconReturn size={14} className="mt-0.5 shrink-0 text-brass" />
              {settings.returnWindowDays}-day size exchange, first courier leg on us.
            </li>
            <li className="flex items-start gap-2">
              <IconShield size={14} className="mt-0.5 shrink-0 text-brass" />
              {settings.codEnabled ? "Cash on delivery available — pay when it reaches you." : "Prepaid orders only; UPI on confirmation."}
            </li>
          </ul>
        </aside>
      </div>

      {suggestions.length > 0 ? (
        <section aria-label="Goes with your bag" className="mt-16 border-t border-line pt-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink">Goes with what you picked</h2>
            <Link href="/shop" className="link-line text-[12px] uppercase tracking-[0.08em] text-muted transition-colors hover:text-ink">
              The full rail
            </Link>
          </div>
          <ProductGrid products={suggestions} columns={4} compact />
        </section>
      ) : null}
    </div>
  );
}

function Line({ term, value, tone }: { term: string; value: string; tone?: "good" }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{term}</dt>
      <dd className={cn("nums", tone === "good" ? "text-good" : "text-ink")}>{value}</dd>
    </div>
  );
}
