import Link from "next/link";
import { AdminEmpty, AdminPageHeader, StatCard } from "@/components/admin/page-bits";
import { SalesBars, StatusBreakdown, TopProducts } from "@/components/admin/charts";
import { LinkButton } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/badge";
import { statusMeta } from "@/lib/order-status";
import { IconPlus, IconArrowRight, IconWhatsapp } from "@/components/ui/icons";
import { getDashboardStats, getInventoryAlerts, getSettings } from "@/server/queries";
import { listEnquiries, enquiryStats } from "@/server/repositories/enquiries.repository";
import { formatDate, formatDateTime, money } from "@/lib/format";


export const dynamic = "force-dynamic";

/**
 * The morning read: what came in overnight, what is still open, what is running
 * out, and what the shop is worth in stock. Charts are static SVG — no charting
 * dependency ships to the browser for this screen.
 */
export default async function AdminOverviewPage() {
  const stats = getDashboardStats();
  const alerts = getInventoryAlerts();
  const settings = getSettings();
  const inbox = enquiryStats();
  const enquiries = listEnquiries({ status: "new", limit: 3 });

  const totals = stats.totals;
  const catalogue = stats.catalogue;
  const people = stats.people;

  return (
    <div className="py-6 sm:py-8">
      <div className="admin-shell">
        <AdminPageHeader
          title="Overview"
          description={`Snapshot taken ${formatDateTime(new Date().toISOString())} · ${settings.shopName}`}
          actions={
            <>
              <LinkButton href="/admin/products/new" variant="solid" size="sm" iconLeft={<IconPlus size={14} />}>
                Add product
              </LinkButton>
              <LinkButton href="/admin/orders" variant="light" size="sm">
                Open order book
              </LinkButton>
            </>
          }
        />

        <section aria-label="Key figures" className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Orders to action" value={totals.pending} tone={totals.pending > 6 ? "warn" : "ink"} hint="Placed, confirmed, packing or packed" href="/admin/orders?status=processing" />
          <StatCard label="Orders today" value={totals.todayOrders} hint={`Worth ${money(totals.todayRevenue)} so far`} href="/admin/orders" />
          <StatCard label="Revenue, all time" value={totals.revenue} suffix="money" hint={`${totals.orders} orders · average ${money(totals.aov)}`} />
          <StatCard label="Delivered" value={totals.delivered} tone="good" hint={`${totals.cancelled} cancelled · ${totals.units} pieces shipped`} href="/admin/orders?status=delivered" />
          <StatCard label="Products live" value={catalogue.published} hint={`${catalogue.hidden} hidden from the shop`} href="/admin/products" />
          <StatCard
            label="Low or out of stock"
            value={alerts.low + alerts.out}
            tone={alerts.out > 0 ? "bad" : alerts.low > 0 ? "warn" : "good"}
            hint={`${alerts.out} sold out · ${alerts.low} running low`}
            href="/admin/inventory"
          />
          <StatCard label="Customers" value={people.customers} hint={`${people.newCustomers} joined in the last 30 days`} href="/admin/customers" />
          <StatCard label="Stock on hand" value={catalogue.stockValue} suffix="money" hint={`${alerts.units} pieces across ${catalogue.products} styles`} href="/admin/inventory" />
        </section>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <SalesBars series={stats.series} />
            <StatusBreakdown counts={stats.byStatus} />
          </div>
          <div className="space-y-4">
            <TopProducts items={stats.topProducts} />

            <section className="admin-card p-5" aria-label="Needs attention">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="admin-section-title">Needs attention</h2>
                <Link href="/admin/orders?status=processing" className="inline-flex items-center gap-1 text-[11.5px] text-muted transition-colors hover:text-ink">
                  All <IconArrowRight size={12} />
                </Link>
              </div>
              {stats.recent.length === 0 ? (
                <AdminEmpty title="No orders yet" description="The moment a customer places one it appears here, along with the money and what to do next." />
              ) : (
                <ul className="mt-3 divide-y divide-line-soft">
                  {stats.recent.slice(0, 6).map((order) => (
                    <li key={order.publicRef}>
                      <Link href={`/admin/orders/${order.id}`} className="-mx-1.5 flex items-center gap-3 rounded-[var(--radius-xs)] px-1.5 py-2.5 transition-colors hover:bg-sand">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-medium text-ink">{order.customerName}</span>
                          <span className="nums mt-0.5 block truncate text-[11px] text-muted">
                            {order.publicRef} · {formatDate(order.placedAt)} · {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                          </span>
                        </span>
                        <StatusPill tone={statusTone(order.status)}>{statusMeta(order.status).short}</StatusPill>
                        <span className="nums w-[68px] shrink-0 text-right text-[12.5px] font-semibold text-ink">{money(order.total)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="admin-card p-5" aria-label="Shop activity">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="admin-section-title">Payment mix</h2>
                <span className="text-[11.5px] text-muted">cash on delivery vs online</span>
              </div>
              <ul className="mt-3 space-y-2 text-[12.5px]">
                {stats.paymentSplit.length === 0 ? (
                  <li className="text-muted">Nothing to split yet.</li>
                ) : (
                  stats.paymentSplit.map((entry) => (
                    <li key={entry.method} className="flex items-center gap-3">
                      <span className="w-[110px] shrink-0 text-graphite">{entry.method === "cod" ? "Cash on delivery" : "Paid online"}</span>
                      <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-sand">
                        <span
                          className="block h-full rounded-full bg-brass"
                          style={{ width: `${Math.max(4, Math.round((entry.value / Math.max(1, totals.revenue)) * 100))}%` }}
                        />
                      </span>
                      <span className="nums w-[104px] shrink-0 text-right text-ink">
                        {money(entry.value)} · {entry.n}
                      </span>
                    </li>
                  ))
                )}
              </ul>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <p className="text-[12.5px] text-graphite">
                  <span className="font-semibold text-ink">{inbox.open}</span> unread message{inbox.open === 1 ? "" : "s"} from customers
                </p>
                <Link href="/admin/enquiries" className="inline-flex items-center gap-1 text-[12px] text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink">
                  Open inbox <IconArrowRight size={12} />
                </Link>
              </div>
              {enquiries.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {enquiries.map((entry) => (
                    <li key={entry.id} className="rounded-[var(--radius-sm)] border border-line-soft bg-bone px-3 py-2">
                      <p className="flex flex-wrap items-baseline gap-2 text-[12px] text-ink">
                        <span className="font-medium">{entry.name ?? "Unnamed"}</span>
                        <span className="text-[11px] text-muted">{entry.topic}</span>
                        <span className="nums ml-auto text-[11px] text-muted">{formatDate(entry.createdAt)}</span>
                      </p>
                      <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-graphite">{entry.message}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
              {settings.whatsappEnabled ? (
                <a
                  href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Hello — checking the day's orders.")}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-4 inline-flex items-center gap-2 text-[12px] text-good transition-opacity hover:opacity-75"
                >
                  <IconWhatsapp size={14} /> Message the shop number
                </a>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function statusTone(status: string) {
  const tone = statusMeta(status).tone;
  return tone === "good" ? "good" : tone === "bad" ? "bad" : tone === "accent" ? "brass" : "quiet";
}
