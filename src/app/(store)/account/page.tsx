import type { Metadata } from "next";
import Link from "next/link";
import { AccountStat, AccountTabs } from "@/components/account/account-tabs";
import { OrderCard } from "@/components/order/order-card";
import { IconArrowRight, IconTruck } from "@/components/ui/icons";
import { customerProfile } from "@/server/repositories/customers.repository";
import { listOrdersForCustomer } from "@/server/repositories/orders.repository";
import { requireCustomerPage } from "@/server/security/guard";
import { formatDate, money } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your account",
  description: "Recent orders, saved addresses and the sizes you wear.",
  robots: { index: false, follow: false },
};

export default async function AccountOverviewPage() {
  const customer = await requireCustomerPage("/account");
  const profile = customerProfile(customer.id);
  const orders = listOrdersForCustomer(customer.id, 3);
  const open = orders.filter((order) => !["delivered", "cancelled"].includes(order.status));

  return (
    <div className="shop-shell py-9 md:py-12">
      <div className="mx-auto max-w-[1000px]">
        <header className="mb-7">
          <p className="eyebrow mb-2">Account</p>
          <h1 className="font-display text-[clamp(1.8rem,1.4rem+1.4vw,2.5rem)] leading-[1.1] text-ink">
            {profile?.name ? `Hello, ${profile.name.split(" ")[0]}` : "Your account"}
          </h1>
          <p className="mt-2 text-[13.5px] text-muted">
            <span className="nums">{customer.mobile}</span>
            {profile?.createdAt ? <> · with us since {formatDate(profile.createdAt)}</> : null}
          </p>
        </header>

        <AccountTabs pathname="/account" counts={{ orders: orders.length, addresses: profile?.addresses.length }} />

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <AccountStat label="Orders" value={profile?.orders ?? 0} hint={profile?.lastOrderAt ? `Last on ${formatDate(profile.lastOrderAt)}` : "Nothing yet"} />
          <AccountStat label="Spent with us" value={money(profile?.spent ?? 0)} hint="Excludes cancelled orders" />
          <AccountStat label="In transit" value={profile?.open ?? 0} hint={open[0] ? `Next: ${open[0].publicRef}` : "Nothing on the way"} />
        </div>

        <section aria-label="Recent orders" className="mt-9">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">Recent orders</h2>
            <Link href="/account/orders" className="group inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.08em] text-muted transition-colors hover:text-ink">
              All orders <IconArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>
          {orders.length > 0 ? (
            <ul className="space-y-3.5">
              {orders.map((order) => (
                <li key={order.id}>
                  <OrderCard order={order} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-md)] border border-line bg-paper px-5 py-6">
              <p className="flex items-center gap-2.5 text-[13.5px] text-graphite">
                <IconTruck size={17} className="text-brass" />
                No orders on this number yet. Orders placed as a guest appear here once the mobile matches.
              </p>
              <Link href="/shop" className="inline-flex h-10 items-center rounded-[var(--radius-sm)] bg-ink px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-bone transition-colors hover:bg-ink-soft">
                Shop the rail
              </Link>
            </div>
          )}
        </section>

        <section aria-label="Shortcuts" className="mt-9 grid gap-3 sm:grid-cols-2">
          <Shortcut href="/account/addresses" title="Saved addresses" text={profile?.addresses.length ? `${profile.addresses.length} saved — checkout fills itself in.` : "Add one and checkout becomes two taps."} />
          <Shortcut href="/account/profile" title="Your details" text="Name and email, kept for invoices and delivery notes." />
        </section>
      </div>
    </div>
  );
}

function Shortcut({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link href={href} className="group flex items-start justify-between gap-4 rounded-[var(--radius-md)] border border-line bg-paper p-5 transition-colors hover:border-ink">
      <span>
        <span className="block text-[14px] font-semibold text-ink">{title}</span>
        <span className="mt-1 block text-[13px] leading-relaxed text-muted">{text}</span>
      </span>
      <IconArrowRight size={16} className="mt-0.5 shrink-0 text-muted transition-transform duration-300 group-hover:translate-x-1 group-hover:text-ink" />
    </Link>
  );
}
