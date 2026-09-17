import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/page-bits";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { IconSearch } from "@/components/ui/icons";
import { listCustomers } from "@/server/repositories/customers.repository";
import { z } from "zod";
import { adminParams, withParam } from "@/lib/admin-query";
import { formatDate, maskMobile, money } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Customers", robots: { index: false } };

type Search = Promise<Record<string, string | string[] | undefined>>;

const querySchema = z.object({
  q: z.string().trim().max(60).optional(),
  sort: z.enum(["recent", "spenders", "newest"]).default("recent"),
  page: z.coerce.number().int().min(1).max(400).default(1),
  perPage: z.coerce.number().int().min(5).max(100).default(25),
});

const SORTS = [
  { value: "recent", label: "Ordered recently" },
  { value: "spenders", label: "Biggest spenders" },
  { value: "newest", label: "Newest accounts" },
];

/**
 * The people list. Guest orders are matched to a customer by mobile number, so a
 * regular who never registered still shows their full history here.
 */
export default async function AdminCustomersPage({ searchParams }: { searchParams: Search }) {
  const raw = await searchParams;
  const parsed = querySchema.parse(adminParams(raw));
  const { items, total, page, pages } = listCustomers({ ...parsed, perPage: 25 });
  const filterParams = adminParams(raw);

  return (
    <div className="py-6 sm:py-8">
      <div className="admin-shell">
        <AdminPageHeader
          title="Customers"
          description="Everyone who has ever ordered, whether they made an account or not. Open a name for their addresses and their whole order book."
        />

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <form method="get" action="/admin/customers" className="relative min-w-[200px] flex-1 lg:max-w-[340px]">
            <span className="sr-only">Search customers</span>
            <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="search" name="q" defaultValue={parsed.q ?? ""} placeholder="Name, mobile or email" className="admin-input pl-9" autoComplete="off" />
            <input type="hidden" name="sort" value={parsed.sort} />
            <button type="submit" className="sr-only">Search</button>
          </form>
          <nav aria-label="Sort customers" className="flex flex-wrap items-center gap-1.5">
            {SORTS.map((sort) => (
              <Link key={sort.value} href={withParam(filterParams, "sort", sort.value)} className={`admin-chip ${parsed.sort === sort.value ? "border-ink bg-ink text-bone" : ""}`}>
                {sort.label}
              </Link>
            ))}
          </nav>
          <p className="ml-auto text-[11.5px] text-muted">
            <span className="nums font-semibold text-ink">{total}</span> {total === 1 ? "person" : "people"}
          </p>
        </div>

        <div className="mt-4 overflow-hidden rounded-[var(--radius-md)] border border-line bg-paper">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <p className="text-[15px] font-medium text-ink">No one matches that search</p>
              <p className="max-w-[44ch] text-[12.5px] leading-relaxed text-muted">
                Try the last four digits of a mobile number — that is how the shop finds people at the counter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table min-w-[760px]">
                <caption className="sr-only">Customers with their order count and spending</caption>
                <thead>
                  <tr>
                    <th scope="col">Customer</th>
                    <th scope="col">Mobile</th>
                    <th scope="col">Email</th>
                    <th scope="col" className="num">Orders</th>
                    <th scope="col" className="num">Spent</th>
                    <th scope="col">Last order</th>
                    <th scope="col">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <Link href={`/admin/customers/${customer.id}`} className="text-[13px] font-medium text-ink hover:underline">
                          {customer.name ?? "Unnamed"}
                        </Link>
                        {customer.openOrders > 0 ? <span className="ml-2 text-[11px] text-brass">{customer.openOrders} open</span> : null}
                      </td>
                      <td className="nums text-[12.5px]">{maskMobile(customer.mobile)}</td>
                      <td className="text-[12px] text-muted">{customer.email ?? "—"}</td>
                      <td className="num text-[13px] font-semibold text-ink">{customer.orders}</td>
                      <td className="num text-[13px] text-ink">{money(customer.spent)}</td>
                      <td className="nowrap text-[12px]">
                        {customer.lastOrderAt ? (
                          <span className="text-graphite">{formatDate(customer.lastOrderAt)}</span>
                        ) : (
                          <span className="text-muted">never ordered</span>
                        )}
                      </td>
                      <td className="nowrap text-[12px] text-muted">{formatDate(customer.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <AdminPagination page={page} pages={pages} total={total} basePath="/admin/customers" label="customers" searchParams={searchParams} />
      </div>
    </div>
  );
}
