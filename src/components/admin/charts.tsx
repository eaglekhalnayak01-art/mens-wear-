import { money } from "@/lib/format";
import { STATUS_META, type OrderStatus } from "@/lib/order-status";
import { cn } from "@/lib/cn";

/**
 * Charts are hand-drawn SVG: no charting library in the bundle, they inherit the
 * palette, and they degrade to the numbers underneath when a screen is small.
 */

export function SalesBars({ series, label = "Revenue, last 14 days" }: { series: { day: string; revenue: number; orders: number }[]; label?: string }) {
  const days = series.slice(-14);
  const max = Math.max(1, ...days.map((entry) => entry.revenue));
  const total = days.reduce((sum, entry) => sum + entry.revenue, 0);
  const width = 100 / Math.max(1, days.length);

  return (
    <figure className="admin-card p-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="admin-section-title">{label}</span>
        <span className="nums text-[13px] font-semibold text-ink">{money(total)}</span>
      </figcaption>

      {days.length === 0 ? (
        <p className="mt-8 text-[13px] text-muted">No orders in the last fortnight. The chart fills itself in as soon as one lands.</p>
      ) : (
        <>
          <svg viewBox="0 0 100 42" preserveAspectRatio="none" className="mt-4 h-[132px] w-full" role="img" aria-label={`Daily revenue bars, ${days.length} days, total ${money(total)}`}>
            <line x1="0" y1="41.5" x2="100" y2="41.5" stroke="var(--color-line)" strokeWidth="0.4" />
            {days.map((entry, index) => {
              const height = Math.max(1.2, (entry.revenue / max) * 38);
              return (
                <g key={entry.day}>
                  <rect
                    x={index * width + width * 0.22}
                    y={41 - height}
                    width={width * 0.56}
                    height={height}
                    rx="0.6"
                    fill={index === days.length - 1 ? "var(--color-brass)" : "var(--color-ink)"}
                    opacity={index === days.length - 1 ? 1 : 0.82}
                  >
                    <title>{`${entry.day} · ${money(entry.revenue)} · ${entry.orders} order${entry.orders === 1 ? "" : "s"}`}</title>
                  </rect>
                </g>
              );
            })}
          </svg>
          <div className="mt-2 flex justify-between text-[10.5px] text-muted">
            <span>{new Date(`${days[0].day}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            <span>{days.length > 1 ? new Date(`${days[days.length - 1].day}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}</span>
          </div>
        </>
      )}
    </figure>
  );
}

export function StatusBreakdown({ counts }: { counts: { status: string; n: number }[] }) {
  const total = counts.reduce((sum, entry) => sum + entry.n, 0) || 1;
  const colors: Record<string, string> = {
    placed: "var(--color-mist)",
    confirmed: "#e6d5ba",
    processing: "var(--color-brass)",
    packed: "#e08b3c",
    shipped: "#8a7b68",
    out_for_delivery: "#6a5d4e",
    delivered: "var(--color-good)",
    cancelled: "var(--color-bad)",
  };

  return (
    <section className="admin-card p-5" aria-label="Orders by status">
      <h2 className="admin-section-title">Order book</h2>
      <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-sand" role="img" aria-label={`${total} orders by status`}>
        {counts.map((entry) => (
          <span
            key={entry.status}
            style={{ width: `${(entry.n / total) * 100}%`, background: colors[entry.status] ?? "var(--color-line)" }}
            title={`${STATUS_META[entry.status as OrderStatus]?.label ?? entry.status}: ${entry.n}`}
          />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        {counts.map((entry) => (
          <li key={entry.status} className="flex items-center gap-2 text-[12px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colors[entry.status] ?? "var(--color-line)" }} aria-hidden="true" />
            <span className="truncate text-graphite">{STATUS_META[entry.status as OrderStatus]?.short ?? entry.status}</span>
            <span className="nums ml-auto font-semibold text-ink">{entry.n}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TopProducts({ items }: { items: { name: string; qty: number; revenue: number; slug: string | null }[] }) {
  const max = Math.max(1, ...items.map((item) => item.revenue));
  return (
    <section className="admin-card p-5" aria-label="Best selling pieces">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="admin-section-title">What is selling</h2>
        <span className="text-[11.5px] text-muted">by value, all time</span>
      </div>
      {items.length === 0 ? (
        <p className="mt-5 text-[13px] text-muted">Nothing sold yet — this list is the first thing that will fill in.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {items.slice(0, 6).map((item) => (
            <li key={item.name}>
              <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
                <span className="truncate text-ink-soft">{item.name}</span>
                <span className="nums shrink-0 text-muted">
                  {item.qty} pc · <span className="font-semibold text-ink">{money(item.revenue)}</span>
                </span>
              </div>
              <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-sand">
                <div className={cn("h-full rounded-full bg-ink")} style={{ width: `${Math.max(4, (item.revenue / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
