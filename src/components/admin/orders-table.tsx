"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusPill } from "@/components/ui/badge";
import { IconArrowRight, IconBox, IconCheck, IconTruck } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/client-api";
import { formatDate, formatDateTime, maskMobile, money } from "@/lib/format";
import { STATUS_META, isTerminal, nextStatus, statusMeta, type OrderStatus } from "@/lib/order-status";
import { cn } from "@/lib/cn";
import type { OrderSummary } from "@/server/repositories/types";

export type AdminOrderRow = OrderSummary & { units: number; preview: { name: string; qty: number; size: string | null }[] };

/**
 * The day&rsquo;s work list. One button moves an order to the next honest state —
 * confirmed, packed, shipped, delivered — and stock is only given back on a cancel,
 * which the service already handles.
 */
export function OrdersTable({ items }: { items: AdminOrderRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [busyRef, setBusyRef] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-sand text-muted">
          <IconBox size={19} />
        </span>
        <p className="text-[15px] font-medium text-ink">No orders match this view</p>
        <p className="max-w-[48ch] text-[12.5px] leading-relaxed text-muted">
          Nothing is wrong — the shop simply has not sold anything under these filters yet. Try “All”, or widen the dates.
        </p>
      </div>
    );
  }

  const advance = async (order: AdminOrderRow) => {
    const target = nextStatus(order.status as OrderStatus);
    if (!target) return;
    setBusyRef(order.publicRef);
    try {
      await api.patch(`/api/admin/orders/${order.id}/status`, { status: target, note: `Marked ${STATUS_META[target].label.toLowerCase()} from the dashboard` });
      startTransition(() => router.refresh());
      toast.push({ title: `${order.publicRef} → ${STATUS_META[target].label}`, tone: "good" });
    } catch (caught) {
      toast.push({
        title: "Status did not change",
        description: caught instanceof ApiError ? caught.message : "Network problem — nothing was saved.",
        tone: "bad",
      });
    } finally {
      setBusyRef(null);
    }
  };

  return (
    <div className={cn(pending && "opacity-70")}>
      <div className="overflow-x-auto">
        <table className="admin-table min-w-[940px]">
          <caption className="sr-only">Orders with customer, value, payment and status</caption>
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Customer</th>
              <th scope="col">Pieces</th>
              <th scope="col" className="num">Total</th>
              <th scope="col">Payment</th>
              <th scope="col">Status</th>
              <th scope="col"><span className="sr-only">Next step</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((order) => {
              const meta = statusMeta(order.status);
              const step = nextStatus(order.status as OrderStatus);
              const late = !isTerminal(order.status) && Date.now() - new Date(`${order.placedAt.slice(0, 10)}T00:00:00`).getTime() > 3 * 86_400_000;
              return (
                <tr key={order.id}>
                  <td className="nowrap">
                    <Link href={`/admin/orders/${order.id}`} className="group block">
                      <span className="nums block text-[12.5px] font-semibold text-ink group-hover:underline">{order.publicRef}</span>
                      <span className="nums block text-[11px] text-muted">{formatDateTime(order.placedAt)}</span>
                    </Link>
                  </td>
                  <td>
                    <span className="block max-w-[190px] truncate text-[12.5px] text-ink">{order.customerName}</span>
                    <span className="nums block text-[11px] text-muted">
                      {maskMobile(order.customerMobile)}
                      {order.city ? ` · ${order.city}` : ""}
                    </span>
                  </td>
                  <td>
                    <span className="block text-[12px] text-graphite">
                      {order.preview[0]?.name ?? "—"}
                      {order.preview.length > 1 ? <span className="text-muted"> +{order.preview.length - 1} more</span> : null}
                    </span>
                    <span className="nums block text-[11px] text-muted">
                      {order.itemCount} line{order.itemCount === 1 ? "" : "s"} · {order.units} pc
                    </span>
                  </td>
                  <td className="num nowrap">
                    <span className="block text-[13px] font-semibold text-ink">{money(order.total)}</span>
                    {order.discount ? <span className="block text-[11px] text-good">−{money(order.discount)}</span> : null}
                  </td>
                  <td className="nowrap">
                    <span className="block text-[12px] text-graphite">{order.paymentMethod === "cod" ? "Cash on delivery" : "Online"}</span>
                    <span className={cn("block text-[11px]", order.paymentStatus === "paid" ? "text-good" : order.paymentStatus === "failed" ? "text-bad" : "text-muted")}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="nowrap">
                    <StatusPill tone={meta.tone === "good" ? "good" : meta.tone === "bad" ? "bad" : meta.tone === "accent" ? "brass" : "quiet"}>{meta.short}</StatusPill>
                    {late ? <span className="ml-1.5 text-[10.5px] text-warn">aging</span> : null}
                  </td>
                  <td className="num nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {step ? (
                        <button
                          type="button"
                          onClick={() => advance(order)}
                          disabled={busyRef === order.publicRef}
                          title={`Move to ${STATUS_META[step].label}`}
                          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 text-[11.5px] text-ink transition-colors hover:border-ink hover:bg-sand disabled:opacity-50"
                        >
                          {busyRef === order.publicRef ? <IconCheck size={12} /> : step === "shipped" ? <IconTruck size={12} /> : <IconArrowRight size={12} />}
                          {STATUS_META[step].short}
                        </button>
                      ) : (
                        <span className="text-[11px] text-muted">{formatDate(order.placedAt)}</span>
                      )}
                      <Link href={`/admin/orders/${order.id}`} className="text-[11.5px] text-muted underline decoration-line underline-offset-4 hover:text-ink">
                        Open
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
