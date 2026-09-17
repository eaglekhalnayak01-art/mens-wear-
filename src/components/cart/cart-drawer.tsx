"use client";

import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { IconButton, LinkButton } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { EmptyState } from "@/components/ui/empty-state";
import { IconBag, IconClose, IconMinus, IconPlus, IconTruck } from "@/components/ui/icons";
import { useCart } from "@/components/cart/cart-provider";
import { money } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Slide-over cart: enough to adjust quantities and get to checkout in one tap. */
export function CartDrawer({ deliveryFee, freeDeliveryOver }: { deliveryFee: number; freeDeliveryOver: number }) {
  const { items, open, setOpen, setQty, remove, totals, syncing, count } = useCart();
  const progress = freeDeliveryOver > 0 ? Math.min(100, Math.round(((freeDeliveryOver - totals.freeShippingGap) / freeDeliveryOver) * 100)) : 100;

  return (
    <Sheet
      open={open}
      onClose={() => setOpen(false)}
      title={
        <div className="flex items-baseline gap-2">
          <h2 className="display text-[19px] text-ink">Your cart</h2>
          <span className="nums text-[12.5px] text-muted">{count} item{count === 1 ? "" : "s"}</span>
        </div>
      }
      footer={
        items.length > 0 ? (
          <div className="space-y-3">
            <dl className="space-y-1.5 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="nums font-semibold text-ink">{money(totals.subtotal)}</dd>
              </div>
              {totals.discount > 0 ? (
                <div className="flex justify-between text-good">
                  <dt>Saving on MRP</dt>
                  <dd className="nums font-medium">−{money(totals.discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="nums text-ink">{totals.shipping === 0 ? <span className="font-medium text-good">Free</span> : money(totals.shipping || deliveryFee)}</dd>
              </div>
              <div className="mt-1 flex items-baseline justify-between border-t border-line pt-2">
                <dt className="text-[13.5px] font-semibold text-ink">Total</dt>
                <dd className="nums text-[17px] font-semibold text-ink" data-money>
                  {money(totals.total)}
                </dd>
              </div>
            </dl>
            {syncing ? <p className="text-[11.5px] text-muted">Updating prices…</p> : null}
            <LinkButton
              href="/checkout"
              onClick={() => setOpen(false)}
              fullWidth
              size="lg"
              className="mt-1"
            >
              Checkout
            </LinkButton>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/cart" onClick={() => setOpen(false)} className="h-10 rounded-[var(--radius-sm)] border border-line bg-paper text-center text-[12.5px] font-medium leading-[38px] text-ink transition-colors hover:bg-sand">
                View cart
              </Link>
              <Link href="/shop" onClick={() => setOpen(false)} className="h-10 rounded-[var(--radius-sm)] text-center text-[12.5px] font-medium leading-[38px] text-ink-soft transition-colors hover:bg-sand">
                Keep shopping
              </Link>
            </div>
          </div>
        ) : null
      }
    >
      {items.length === 0 ? (
        <div className="px-5 py-10">
          <EmptyState
            icon={<IconBag size={19} />}
            title="Your cart is empty"
            description="Nothing here yet. Start with the pieces our regulars keep coming back for."
            className="border-0 bg-transparent py-6"
            action={
              <Link href="/shop" onClick={() => setOpen(false)} className="inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-ink px-5 text-[12.5px] font-semibold uppercase tracking-[0.07em] text-bone">
                Browse the collection
              </Link>
            }
          />
        </div>
      ) : (
        <div>
          {freeDeliveryOver > 0 && totals.freeShippingGap > 0 ? (
            <div className="border-b border-line-soft bg-paper/70 px-5 py-3">
              <p className="flex items-center gap-2 text-[12.5px] text-ink-soft">
                <IconTruck size={15} className="text-brass" />
                Add <span className="nums font-semibold text-ink">{money(totals.freeShippingGap)}</span> more for free delivery
              </p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-sand">
                <div className="h-full rounded-full bg-brass transition-[width] duration-500 ease-[cubic-bezier(.22,.61,.36,1)]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : items.length > 0 ? (
            <div className="border-b border-line-soft bg-good-tint/60 px-5 py-2.5">
              <p className="flex items-center gap-2 text-[12.5px] font-medium text-good">
                <IconTruck size={15} /> Free delivery unlocked on this order
              </p>
            </div>
          ) : null}

          <ul className="divide-y divide-line-soft px-5">
            {items.map((item) => (
              <li key={item.variantId} className="flex gap-3.5 py-4">
                <Link href={`/product/${item.slug}`} onClick={() => setOpen(false)} className="block w-[76px] shrink-0">
                  <SafeImage src={item.image} alt={item.name} className="aspect-[4/5] w-[76px] rounded-[var(--radius-xs)]" sizes="76px" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/product/${item.slug}`} onClick={() => setOpen(false)} className="text-[13.5px] font-medium leading-snug text-ink hover:underline">
                      {item.name}
                    </Link>
                    <IconButton label={`Remove ${item.name}`} onClick={() => remove(item.variantId)} className="h-7 w-7 border-transparent bg-transparent hover:bg-sand">
                      <IconClose size={13} />
                    </IconButton>
                  </div>
                  <p className="mt-1 text-[12px] text-muted">
                    {[item.size && `Size ${item.size}`, item.color].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center rounded-full border border-line bg-paper">
                      <button
                        type="button"
                        onClick={() => setQty(item.variantId, item.qty - 1)}
                        aria-label={`Decrease quantity of ${item.name}`}
                        className="grid h-8 w-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-sand disabled:opacity-40"
                        disabled={item.qty <= 1}
                      >
                        <IconMinus size={13} />
                      </button>
                      <span className="nums w-7 text-center text-[13px] font-semibold" aria-live="polite">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(item.variantId, item.qty + 1)}
                        aria-label={`Increase quantity of ${item.name}`}
                        className={cn("grid h-8 w-8 place-items-center rounded-full text-ink-soft transition-colors hover:bg-sand", item.availableStock !== undefined && item.qty >= item.availableStock && "opacity-40")}
                        disabled={item.availableStock !== undefined && item.qty >= item.availableStock}
                      >
                        <IconPlus size={13} />
                      </button>
                    </div>
                    <p className="nums text-[13.5px] font-semibold text-ink" data-money>
                      {money(item.unitPrice * item.qty)}
                    </p>
                  </div>
                  {item.availableStock !== undefined && item.availableStock <= 4 ? (
                    <p className="mt-1.5 text-[11.5px] font-medium text-warn">Only {item.availableStock} left in this size</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  );
}
