import Link from "next/link";
import { StatusPill } from "@/components/ui/badge";
import { StatusProgress } from "@/components/order/order-timeline";
import { SafeImage } from "@/components/ui/safe-image";
import { statusMeta } from "@/lib/order-status";
import { formatDate, money } from "@/lib/format";
import type { OrderSummary } from "@/server/repositories/types";
import { orderTrackingPath } from "@/server/security/order-access";

/**
 * One row per order for the account list and the tracking page. Preview images come
 * from the order snapshot, so an order still looks right after the product is
 * edited or unpublished.
 */
export function OrderCard({ order, preview }: { order: OrderSummary; preview?: { name: string; image: string | null }[] }) {
  const meta = statusMeta(order.status);
  return (
    <article className="card-surface overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <Link href={orderTrackingPath(order.publicRef)} className="text-[13px] font-semibold text-ink transition-colors hover:text-brass-deep">
            Order {order.publicRef}
          </Link>
          <p className="mt-0.5 text-[12px] text-muted">
            {formatDate(order.placedAt)} · {order.itemCount} {order.itemCount === 1 ? "piece" : "pieces"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill tone={meta.tone === "good" ? "good" : meta.tone === "bad" ? "bad" : meta.tone === "accent" ? "brass" : "quiet"}>{meta.short}</StatusPill>
          <span className="nums text-[13.5px] font-semibold text-ink">{money(order.total)}</span>
        </div>
      </header>

      <div className="px-4 py-4 sm:px-5">
        {preview && preview.length > 0 ? (
          <ul className="flex flex-wrap items-center gap-3">
            {preview.slice(0, 4).map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex items-center gap-2.5">
                <SafeImage src={item.image ?? ""} alt="" className="h-[52px] w-[40px] rounded-[4px] bg-sand" sizes="40px" />
                <span className="max-w-[15ch] truncate text-[12.5px] text-graphite">{item.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-muted">{order.customerName} · {order.itemCount} item(s)</p>
        )}

        <StatusProgress status={order.status} className="mt-4" />
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted">{meta.note}</p>

        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <Link href={orderTrackingPath(order.publicRef)} className="link-line text-[12.5px] text-ink">
            View & track
          </Link>
          <span className="text-[12px] text-muted">
            {order.paymentMethod === "cod" ? "Cash on delivery" : "Paid online"}
            {order.paymentStatus === "pending" && order.paymentMethod === "cod"
              ? " · due on delivery"
              : order.paymentStatus !== "paid" && order.paymentMethod === "online"
                ? " · payment being checked"
                : ""}
          </span>
        </div>
      </div>
    </article>
  );
}
