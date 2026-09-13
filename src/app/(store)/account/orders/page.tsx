import type { Metadata } from "next";
import Link from "next/link";
import { AccountTabs } from "@/components/account/account-tabs";
import { OrderCard } from "@/components/order/order-card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconBag } from "@/components/ui/icons";
import { customerProfile } from "@/server/repositories/customers.repository";
import { listOrdersForCustomer } from "@/server/repositories/orders.repository";
import { requireCustomerPage } from "@/server/security/guard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your orders",
  description: "Everything you have ordered from Aakash Men's Wear, with live status for each one.",
  robots: { index: false, follow: false },
};

type Search = Promise<{ status?: string }>;

export default async function AccountOrdersPage({ searchParams }: { searchParams: Search }) {
  const customer = await requireCustomerPage("/account/orders");
  const { status } = await searchParams;
  const profile = customerProfile(customer.id);
  const all = listOrdersForCustomer(customer.id, 40);
  const orders = status === "open" ? all.filter((order) => !["delivered", "cancelled"].includes(order.status)) : status === "cancelled" ? all.filter((order) => order.status === "cancelled") : all;

  const filters = [
    { key: "", label: "All" },
    { key: "open", label: "In progress" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="shop-shell py-9 md:py-12">
      <div className="mx-auto max-w-[1000px]">
        <header className="mb-7">
          <p className="eyebrow mb-2">Account</p>
          <h1 className="font-display text-[clamp(1.7rem,1.35rem+1.3vw,2.3rem)] leading-[1.1] text-ink">Your orders</h1>
        </header>

        <AccountTabs pathname="/account/orders" counts={{ orders: all.length, addresses: profile?.addresses.length }} />

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <Link
              key={filter.key}
              href={filter.key ? `/account/orders?status=${filter.key}` : "/account/orders"}
              className={
                (status ?? "") === filter.key
                  ? "h-8 rounded-full bg-ink px-3.5 text-[12.5px] font-medium text-bone"
                  : "h-8 rounded-full border border-line px-3.5 text-[12.5px] text-graphite transition-colors hover:border-ink hover:text-ink"
              }
            >
              {filter.label}
            </Link>
          ))}
        </div>

        <div className="mt-5">
          {orders.length > 0 ? (
            <ul className="space-y-3.5">
              {orders.map((order) => (
                <li key={order.id}>
                  <OrderCard order={order} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<IconBag size={22} />}
              title={status ? "Nothing in this filter" : "No orders on this number yet"}
              description={
                status
                  ? "Orders move between these tabs as we pack and ship them. Switch back to All to see everything."
                  : "When you order — online or in the shop with this number — it lands here with its live status."
              }
              action={
                <Link href="/shop" className="inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-ink px-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-bone transition-colors hover:bg-ink-soft">
                  Shop the rail
                </Link>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
