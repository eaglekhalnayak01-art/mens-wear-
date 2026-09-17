import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/page-bits";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { OrdersTable } from "@/components/admin/orders-table";
import { LinkButton } from "@/components/ui/button";
import { IconDownload, IconSearch } from "@/components/ui/icons";
import { listAdminOrders } from "@/server/repositories/orders.repository";
import { orderFilterSchema } from "@/server/validation/schemas";
import { adminParams, withParam } from "@/lib/admin-query";
import { STATUS_META, ORDER_STATUSES } from "@/lib/order-status";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

type Search = Promise<Record<string, string | string[] | undefined>>;

const PER_PAGE = 25;

/** Tabs map onto filters the repository understands; "open" is the working list. */
const TABS = [
  { value: "open", label: "Needs action", statuses: ["placed", "confirmed", "processing", "packed"] as const },
  { value: "shipped", label: "Shipped", statuses: ["shipped", "out_for_delivery"] as const },
  { value: "delivered", label: "Delivered", statuses: ["delivered"] as const },
  { value: "cancelled", label: "Cancelled", statuses: ["cancelled"] as const },
];

export default async function AdminOrdersPage({ searchParams }: { searchParams: Search }) {
  const raw = await searchParams;
  const filterParams = adminParams(raw);
  const parsed = orderFilterSchema.parse(filterParams);
  const { items, total, matchingValue, page, pages, statusCounts } = listAdminOrders({ ...parsed, perPage: PER_PAGE });

  const countFor = (statuses: readonly string[]) => statuses.reduce((sum, status) => sum + (statusCounts[status]?.count ?? 0), 0);
  const exportQuery = new URLSearchParams(filterParams).toString();

  return (
    <div className="py-6 sm:py-8">
      <div className="admin-shell">
        <AdminPageHeader
          title="Orders"
          description="Every order, newest first. Move a status here and the customer’s tracking link shows it the moment they reload."
          actions={
            <LinkButton href={`/api/admin/orders/export${exportQuery ? `?${exportQuery}` : ""}`} variant="light" size="sm" iconLeft={<IconDownload size={14} />}>
              Export CSV
            </LinkButton>
          }
        />

        <nav aria-label="Order filters" className="mt-5 flex flex-wrap items-center gap-1.5">
          <Link href="/admin/orders" className={`admin-chip ${parsed.status === "all" ? "border-ink bg-ink text-bone" : ""}`}>
            All <span className="nums opacity-70">{statusCounts.all.count}</span>
          </Link>
          {TABS.map((tab) => (
            <Link
              key={tab.value}
              href={withParam(filterParams, "status", tab.value)}
              className={`admin-chip ${parsed.status === tab.value ? "border-ink bg-ink text-bone" : ""}`}
            >
              {tab.label} <span className="nums opacity-70">{countFor(tab.statuses)}</span>
            </Link>
          ))}
          {total > 0 ? <span className="ml-auto text-[11.5px] text-muted">Matching this view: <span className="nums font-semibold text-ink">{money(matchingValue)}</span></span> : null}
        </nav>

        <form method="get" action="/admin/orders" className="mt-3 flex flex-wrap items-center gap-2">
          <label className="relative min-w-[190px] flex-1 lg:max-w-[320px]">
            <span className="sr-only">Search orders</span>
            <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="search" name="q" defaultValue={parsed.q ?? ""} placeholder="Order no., name, mobile, city, product" className="admin-input pl-9" autoComplete="off" />
          </label>
          <select name="status" defaultValue={parsed.status} className="admin-input w-auto min-w-[156px]" aria-label="Status">
            <option value="all">Any status</option>
            <option value="open">Needs action (group)</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_META[status].label}
              </option>
            ))}
          </select>
          <select name="payment" defaultValue={parsed.payment} className="admin-input w-auto min-w-[140px]" aria-label="Payment">
            <option value="all">Any payment</option>
            <option value="cod">Cash on delivery</option>
            <option value="online">Paid online</option>
            <option value="pending">Payment pending</option>
            <option value="paid">Payment received</option>
          </select>
          <label className="flex items-center gap-1.5 text-[11.5px] text-muted">
            <span className="sr-only">From date</span>
            <input type="date" name="from" defaultValue={parsed.from ?? ""} className="admin-input h-10 w-[142px] px-2 text-[12.5px]" />
            <span>to</span>
            <input type="date" name="to" defaultValue={parsed.to ?? ""} className="admin-input h-10 w-[142px] px-2 text-[12.5px]" />
          </label>
          <select name="sort" defaultValue={parsed.sort} className="admin-input w-auto min-w-[140px]" aria-label="Sort by">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="value_high">Value high–low</option>
            <option value="value_low">Value low–high</option>
          </select>
          <button type="submit" className="admin-chip h-10 px-4 text-[12.5px] font-medium">
            Apply
          </button>
          {parsed.q || parsed.status !== "all" || parsed.payment !== "all" || parsed.from || parsed.to ? (
            <Link href="/admin/orders" className="text-[11.5px] text-muted underline decoration-line underline-offset-4 hover:text-ink">
              Clear
            </Link>
          ) : null}
        </form>

        <div className="mt-4 overflow-hidden rounded-[var(--radius-md)] border border-line bg-paper">
          <OrdersTable items={items} />
        </div>

        <AdminPagination page={page} pages={pages} total={total} basePath="/admin/orders" label="orders" searchParams={searchParams} />
      </div>
    </div>
  );
}
