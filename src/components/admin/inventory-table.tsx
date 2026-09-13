"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SafeImage } from "@/components/ui/safe-image";
import { api, ApiError } from "@/lib/client-api";
import { money } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { InventoryRow } from "@/server/repositories/inventory.repository";

/**
 * Stock, the way it is actually counted: open the row, type the number you can see,
 * move on. Each cell saves on its own (blur or Enter) so nothing is lost when the
 * owner gets called to the counter mid-edit.
 */
export function InventoryTable({ items }: { items: InventoryRow[] }) {
  const [openId, setOpenId] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
        <p className="text-[15px] font-medium text-ink">Nothing in this view</p>
        <p className="max-w-[46ch] text-[12.5px] leading-relaxed text-muted">
          Every style on the shelf is counted here. Switch the filter, or search by name or SKU.
        </p>
      </div>
    );
  }

  const maxStock = Math.max(12, ...items.map((item) => item.stock));

  return (
    <ul className="divide-y divide-line-soft">
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <li key={item.id} className={cn(open && "bg-sand/35")}>
            <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:px-4">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : item.id)}
                aria-expanded={open}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className="relative block h-11 w-9 shrink-0 overflow-hidden rounded-[var(--radius-xs)] bg-sand ring-1 ring-line-soft">
                  {item.image ? <SafeImage src={item.image} alt="" sizes="36px" className="h-full w-full object-cover" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{item.name}</span>
                  <span className="nums block text-[11px] text-muted">
                    {item.sku ?? "no SKU"} · {item.category ?? "uncategorised"} · {money(item.price)} · {item.sold} sold
                  </span>
                </span>
              </button>

              <span className="hidden w-[92px] shrink-0 md:block">
                <span className="block h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <span
                    className={cn("block h-full rounded-full", item.state === "out" ? "bg-bad" : item.state === "low" ? "bg-warn" : "bg-good")}
                    style={{ width: `${Math.max(4, Math.round((item.stock / maxStock) * 100))}%` }}
                  />
                </span>
              </span>

              <span className="nums w-[54px] shrink-0 text-right text-[13px] font-semibold text-ink">
                {item.stock}
                <span className="block text-[10px] font-normal text-muted">pcs</span>
              </span>

              <span
                className={cn(
                  "inline-flex h-6 shrink-0 items-center rounded-full px-2 text-[11px] font-medium",
                  item.state === "out" ? "bg-bad-tint text-bad" : item.state === "low" ? "bg-warn-tint text-warn" : "bg-good-tint text-good",
                )}
              >
                {item.state === "out" ? "Sold out" : item.state === "low" ? `Low · ${item.stock} left` : "Healthy"}
              </span>

              <button
                type="button"
                onClick={() => setOpenId(open ? null : item.id)}
                className="admin-chip h-7 shrink-0 px-2.5 text-[11.5px]"
              >
                {open ? "Close" : `Count ${item.variants.length}`}
              </button>
            </div>

            {open ? (
              <div className="border-t border-line-soft px-3 pb-4 pt-3 sm:px-4">
                {item.variants.length === 0 ? (
                  <p className="text-[12.5px] text-muted">
                    This style has no size rows yet —{" "}
                    <Link href={`/admin/products/${item.id}`} className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
                      add its sizes in the product form
                    </Link>
                    .
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11.5px] text-muted">
                        Tap a number to change it · saves when you leave the box
                        {item.status !== "published" ? <span className="ml-1 text-warn">· this style is hidden from the shop</span> : null}
                      </p>
                      <QuickAdjust productId={item.id} productName={item.name} />
                    </div>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {item.variants.map((variant) => (
                        <StockCell key={variant.variantId} productId={item.id} variant={variant} threshold={item.lowStockThreshold} />
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function StockCell({
  variant,
  threshold,
  productId,
}: {
  variant: { variantId: number; size: string | null; color: string | null; stock: number; sku: string | null };
  threshold: number;
  productId: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(String(variant.stock));
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  const dirty = value !== String(variant.stock);

  const commit = async () => {
    if (!dirty) return;
    const next = Math.max(0, Math.min(999, Number(value) || 0));
    setSaving(true);
    setFailed(false);
    try {
      await api.put("/api/admin/inventory", {
        variantId: variant.variantId,
        stock: next,
        // The ledger distinguishes cloth that arrived from cloth that was merely
        // corrected — a hand count that goes up is a restock.
        reason: next > variant.stock ? "restock" : "adjustment",
      });
      startTransition(() => router.refresh());
    } catch (caught) {
      setFailed(true);
      setValue(String(variant.stock));
      console.error(caught instanceof ApiError ? caught.message : "stock save failed");
    } finally {
      setSaving(false);
    }
  };

  // Tone follows the number being typed, not the saved one — the owner sees what
  // the shelf would look like before they commit.
  const candidate = Math.max(0, Math.min(999, Number(value) || 0));
  const base = dirty ? candidate : variant.stock;
  const low = base === 0 ? "out" : base <= threshold ? "low" : "ok";

  return (
    <li className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-paper px-2.5 py-1.5">
      <span className="text-[11.5px] text-graphite">
        {variant.color ?? "—"}
        {variant.size ? <span className="nums ml-1 font-medium text-ink">{variant.size}</span> : null}
      </span>
      <input
        value={value}
        inputMode="numeric"
        onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        aria-label={`${variant.color ?? ""} ${variant.size ?? ""} stock for product ${productId}`}
        className={cn(
          "admin-input h-7 w-[52px] px-1 text-right text-[12.5px]",
          failed && "border-bad bg-bad-tint",
          saving && "opacity-60",
          dirty && "border-ink bg-brass/8",
          low === "out" && !dirty && "border-bad/30 bg-bad-tint text-bad",
          low === "low" && !dirty && "border-warn/35 bg-warn-tint text-warn",
        )}
      />
    </li>
  );
}

function QuickAdjust({ productId, productName }: { productId: number; productName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const adjust = async (delta: number) => {
    setBusy(true);
    try {
      await api.post("/api/admin/inventory", { productId, delta, note: delta > 0 ? "Restock counted in by hand" : "Pulled from the shelf" });
      router.refresh();
    } catch (caught) {
      console.error(caught instanceof ApiError ? caught.message : "adjust failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[11px] text-muted">{productName ? "Whole style:" : ""}</span>
      <button type="button" disabled={busy} onClick={() => void adjust(-1)} className="admin-chip h-7 px-2 text-[11.5px]" aria-label={`Remove one of ${productName}`}>
        −1
      </button>
      <button type="button" disabled={busy} onClick={() => void adjust(5)} className="admin-chip h-7 px-2 text-[11.5px]" aria-label={`Add five of ${productName}`}>
        +5
      </button>
      <button type="button" disabled={busy} onClick={() => void adjust(10)} className="admin-chip h-7 px-2 text-[11.5px]" aria-label={`Add ten of ${productName}`}>
        +10
      </button>
    </span>
  );
}

