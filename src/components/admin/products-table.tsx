"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SafeImage } from "@/components/ui/safe-image";
import { IconButton } from "@/components/ui/button";
import { IconCheck, IconClose, IconEdit, IconTag, IconTrash } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/client-api";
import { discountPercent, formatDate, money } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ProductCard, ProductVariant } from "@/server/repositories/types";

export type AdminProductRow = ProductCard & {
  status: string;
  sku: string | null;
  soldQty: number;
  lowStockThreshold: number;
  outOfStockCount: number;
  imageCount: number;
  updatedAt: string;
  createdAt: string;
  variants: ProductVariant[];
};

/**
 * The catalogue table. Everything the owner changes most often — visible or not,
 * which home rail it belongs to, the price and stock — is reachable here without
 * opening the full form; the form is for building a product, the table is for
 * running it.
 */
export function ProductsTable({ items }: { items: AdminProductRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-[15px] font-medium text-ink">Nothing matches these filters</p>
        <p className="max-w-[46ch] text-[12.5px] leading-relaxed text-muted">
          Clear the search, or add the piece you are looking for — a new style takes about a minute once the photograph is on the counter.
        </p>
        <Link href="/admin/products/new" className="mt-1 text-[12.5px] text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
          Add a product
        </Link>
      </div>
    );
  }

  const patch = async (id: number, body: Record<string, unknown>, done: string) => {
    try {
      await api.patch(`/api/admin/products/${id}`, body);
      startTransition(() => router.refresh());
      toast.push({ title: done, tone: "good" });
    } catch (caught) {
      toast.push({ title: "That change did not save", description: caught instanceof ApiError ? caught.message : "Network problem — try again.", tone: "bad" });
    }
  };

  return (
    <div className={cn("relative", pending && "opacity-70")}>
      <div className="overflow-x-auto">
        <table className="admin-table min-w-[860px]">
          <caption className="sr-only">Products in the catalogue, with price, stock and visibility</caption>
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Category</th>
              <th scope="col" className="num">Price</th>
              <th scope="col" className="num">Stock</th>
              <th scope="col">On the rails</th>
              <th scope="col">Visibility</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const off = item.discountPct || discountPercent(item.price, item.compareAtPrice);
              const soldOut = item.stock === 0;
              const low = !soldOut && item.stock <= item.lowStockThreshold;
              return (
                <tr key={item.id}>
                  <td className="nowrap">
                    <Link href={`/admin/products/${item.id}`} className="flex items-center gap-3 group">
                      <span className="relative block h-14 w-11 shrink-0 overflow-hidden rounded-[var(--radius-xs)] bg-sand ring-1 ring-line-soft">
                        <SafeImage src={item.image.src} alt="" sizes="44px" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-ink">{item.name}</span>
                        <span className="nums mt-0.5 block text-[11px] text-muted">
                          {item.sku ?? "no SKU"} · {item.imageCount} image{item.imageCount === 1 ? "" : "s"} · {item.sizes.length} size{item.sizes.length === 1 ? "" : "s"}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="text-[12px] text-graphite">
                    {item.category?.name ?? "—"}
                    {item.subCategory ? <span className="block text-[11px] text-muted">{item.subCategory}</span> : null}
                  </td>
                  <td className="num whitespace-nowrap">
                    <span className="block text-[13px] font-semibold text-ink">{money(item.price)}</span>
                    {off > 0 ? (
                      <span className="block text-[11px] text-muted">
                        <s className="nums">{money(item.compareAtPrice ?? 0)}</s> · {off}%
                      </span>
                    ) : null}
                  </td>
                  <td className="num whitespace-nowrap">
                    <span className={cn("text-[13px] font-semibold", soldOut ? "text-bad" : low ? "text-warn" : "text-ink")}>{item.stock}</span>
                    <span className="block text-[11px] text-muted">
                      {soldOut ? "sold out" : low ? `low · ${item.lowStockThreshold}` : `sold ${item.soldQty}`}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <FlagButton label="New" active={item.isNewArrival} onPress={(next) => patch(item.id, { isNewArrival: next }, next ? "Marked as a new arrival" : "Removed from New Arrivals")} />
                      <FlagButton label="Best" active={item.isBestseller} onPress={(next) => patch(item.id, { isBestseller: next }, next ? "Now a bestseller" : "Removed from Best sellers")} />
                      <FlagButton label="Home" active={item.isFeatured} onPress={(next) => patch(item.id, { isFeatured: next }, next ? "Added to Featured" : "Removed from Featured")} />
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-[11px] font-medium",
                          item.status === "published" ? "bg-good-tint text-good" : item.status === "draft" ? "bg-sand text-muted" : "bg-line/60 text-graphite",
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", item.status === "published" ? "bg-good" : item.status === "draft" ? "bg-muted" : "bg-graphite")} />
                        {item.status}
                      </span>
                      {item.status !== "published" ? (
                        <button type="button" onClick={() => patch(item.id, { status: "published" }, "Published to the shop")} className="text-[11.5px] text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
                          Publish
                        </button>
                      ) : (
                        <button type="button" onClick={() => patch(item.id, { status: "hidden" }, "Hidden from the shop")} className="text-[11.5px] text-muted underline decoration-line underline-offset-4 hover:text-ink hover:decoration-ink">
                          Hide
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="num whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <IconButton label={`Edit ${item.name}`} onClick={() => router.push(`/admin/products/${item.id}`)}>
                        <IconEdit size={15} />
                      </IconButton>
                      <IconButton label={`Stock for ${item.name}`} onClick={() => router.push(`/admin/inventory?q=${encodeURIComponent(item.name)}`)}>
                        <IconTag size={15} />
                      </IconButton>
                      <DeleteProductButton
                        product={{ id: item.id, name: item.name, soldQty: item.soldQty }}
                        onDeleted={(message) => {
                          startTransition(() => router.refresh());
                          toast.push({ title: message, tone: "good" });
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-3 py-2 text-[11px] text-muted">
        Last edited {formatDate(items[0].updatedAt)} · prices show the customer&rsquo;s view, discounts are computed from the compare-at price.
      </p>
    </div>
  );
}

function FlagButton({ label, active, onPress }: { label: string; active: boolean; onPress: (next: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onPress(!active)}
      title={active ? `Remove from the ${label} rail` : `Add to the ${label} rail`}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] transition-colors",
        active ? "border-brass bg-brass/12 text-ink" : "border-line text-muted hover:border-ink hover:text-ink",
      )}
    >
      {active ? <IconCheck size={11} /> : <IconClose size={11} className="opacity-40" />}
      {label}
    </button>
  );
}

/**
 * Deleting is destructive, so it asks once and tells the truth: a style people have
 * bought is hidden rather than erased, because the order history has to keep making sense.
 */
function DeleteProductButton({ product, onDeleted }: { product: { id: number; name: string; soldQty: number }; onDeleted: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      const result = await api.del<{ ok: boolean; deleted?: boolean; hidden?: boolean }>(`/api/admin/products/${product.id}`);
      setOpen(false);
      onDeleted(result.deleted ? "Product and its uploads removed" : "Hidden from the shop — its sales history is intact");
    } catch (caught) {
      onDeleted(caught instanceof ApiError ? caught.message : "Network problem — nothing changed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <IconButton label={`Delete ${product.name}`} tone="danger" onClick={() => setOpen(true)}>
        <IconTrash size={15} />
      </IconButton>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center" role="dialog" aria-modal="true" aria-label={`Delete ${product.name}`}>
          <button type="button" aria-label="Cancel" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/45" />
          <div className="animate-fade-up relative w-full max-w-[420px] rounded-[var(--radius-md)] border border-line bg-paper p-5">
            <h2 className="text-[15px] font-semibold text-ink">Delete “{product.name}”?</h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              {product.soldQty > 0
                ? `This style has ${product.soldQty} pieces sold. We will hide it from the shop and keep its records, so old orders and the sales report still make sense.`
                : "It has never been sold, so it can be removed completely — images included."}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="admin-chip h-9 px-3">
                Keep it
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={remove}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-bad px-4 text-[12.5px] font-medium text-bone transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {busy ? "Working…" : product.soldQty > 0 ? "Hide it" : "Delete it"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
