import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { AdminPageHeader } from "@/components/admin/page-bits";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { InventoryTable } from "@/components/admin/inventory-table";
import { IconSearch } from "@/components/ui/icons";
import { listInventory, stockMovements } from "@/server/repositories/inventory.repository";
import { getInventoryAlerts } from "@/server/queries";
import { adminParams, withParam } from "@/lib/admin-query";
import { formatDateTime, money } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Inventory", robots: { index: false } };

type Search = Promise<Record<string, string | string[] | undefined>>;

const querySchema = z.object({
  q: z.string().trim().max(60).optional(),
  state: z.enum(["all", "low", "out", "ok", "hidden"]).default("low"),
  page: z.coerce.number().int().min(1).max(200).default(1),
  perPage: z.coerce.number().int().min(5).max(100).default(25),
});

const FILTERS = [
  { value: "low", label: "Running low" },
  { value: "out", label: "Sold out" },
  { value: "ok", label: "Healthy" },
  { value: "hidden", label: "Hidden styles" },
  { value: "all", label: "Everything" },
];

export default async function AdminInventoryPage({ searchParams }: { searchParams: Search }) {
  const raw = await searchParams;
  const parsed = querySchema.parse(adminParams(raw));
  const { items, total, page, pages } = listInventory(parsed);
  const alerts = getInventoryAlerts();
  const movements = stockMovements(undefined, 12);
  const filterParams = adminParams(raw);

  return (
    <div className="py-6 sm:py-8">
      <div className="admin-shell">
        <AdminPageHeader title="Inventory" description="What is on the shelf, size by size. Count something in and the shop stops overselling it within a second." />

        <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px]">
          <span className="rounded-full bg-warn-tint px-2.5 py-1 text-warn">{alerts.low} low</span>
          <span className="rounded-full bg-bad-tint px-2.5 py-1 text-bad">{alerts.out} sold out</span>
          <span className="text-muted">
            <span className="nums font-semibold text-ink">{alerts.units}</span> pieces on hand · worth{" "}
            <span className="nums font-semibold text-ink">{money(alerts.value)}</span> at ticket price
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <form method="get" action="/admin/inventory" className="relative min-w-[200px] flex-1 lg:max-w-[320px]">
            <span className="sr-only">Search by name or SKU</span>
            <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="search" name="q" defaultValue={parsed.q ?? ""} placeholder="Name or SKU" className="admin-input pl-9" autoComplete="off" />
            <input type="hidden" name="state" value={parsed.state} />
            <button type="submit" className="sr-only">Search</button>
          </form>
          <nav aria-label="Stock filters" className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((filter) => (
              <Link key={filter.value} href={withParam(filterParams, "state", filter.value)} className={`admin-chip ${parsed.state === filter.value ? "border-ink bg-ink text-bone" : ""}`}>
                {filter.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-line bg-paper">
            <InventoryTable items={items} />
            {items.length > 0 ? (
              <p className="border-t border-line px-3 py-2 text-[11px] text-muted">
                Showing {items.length} of {total} styles in this view · sorted by fewest pieces first
              </p>
            ) : null}
          </div>

          <section className="admin-card p-4" aria-label="Recent stock movements">
            <h2 className="admin-section-title">Stock ledger</h2>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted">Every sale, restock and correction, newest first.</p>
            {movements.length === 0 ? (
              <p className="mt-4 text-[12.5px] text-muted">Nothing written yet.</p>
            ) : (
              <ol className="mt-3 space-y-2.5">
                {movements.map((entry) => (
                  <li key={entry.id} className="text-[11.5px] leading-snug">
                    <p className="flex items-baseline justify-between gap-2">
                      <span className={entry.delta > 0 ? "nums font-semibold text-good" : "nums font-semibold text-bad"}>
                        {entry.delta > 0 ? "+" : ""}
                        {entry.delta}
                      </span>
                      <span className="text-muted">{formatDateTime(entry.createdAt).split(",").slice(-1)[0]}</span>
                    </p>
                    <p className="truncate text-graphite">
                      {entry.productName}
                      {entry.size ? ` · ${entry.size}` : ""}
                      {entry.color ? ` · ${entry.color}` : ""}
                    </p>
                    <p className="text-muted">
                      {entry.reason.replace(/_/g, " ")}
                      {entry.orderRef ? ` · ${entry.orderRef}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <AdminPagination page={page} pages={pages} total={total} basePath="/admin/inventory" label="styles" searchParams={searchParams} />
      </div>
    </div>
  );
}
