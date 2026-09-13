import type { Metadata } from "next";
import Link from "next/link";
import { OrderCard } from "@/components/order/order-card";
import { PageHeader } from "@/components/layout/page-header";
import { IconInfo, IconWhatsapp } from "@/components/ui/icons";
import { getOrderByRef, listRecentOrdersForMobile } from "@/server/repositories/orders.repository";
import { currentCustomer } from "@/server/security/guard";
import { listOrdersForCustomer } from "@/server/repositories/orders.repository";
import { getSettings } from "@/server/queries";
import { normalizeMobile } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Enter your order reference and mobile number to see exactly where your parcel is — packed, shipped, out for delivery or delivered.",
  alternates: { canonical: "/track" },
};

type Search = Promise<{ ref?: string; mobile?: string }>;

export default async function TrackPage({ searchParams }: { searchParams: Search }) {
  const { ref, mobile } = await searchParams;
  const settings = getSettings();
  const customer = await currentCustomer();

  let lookup: { kind: "idle" | "found" | "unmatched" | "notfound"; order?: ReturnType<typeof getOrderByRef>; recent?: ReturnType<typeof listRecentOrdersForMobile> } = { kind: "idle" };

  const trimmedRef = (ref ?? "").trim().toUpperCase();
  const trimmedMobile = (mobile ?? "").trim();

  if (trimmedRef) {
    const order = getOrderByRef(trimmedRef);
    if (!order) {
      lookup = { kind: "notfound" };
    } else if (trimmedMobile && normalizeMobile(trimmedMobile) !== normalizeMobile(order.customerMobile)) {
      lookup = { kind: "unmatched", order };
    } else {
      lookup = { kind: "found", order };
    }
  }

  const mine = customer ? listOrdersForCustomer(customer.id, 4) : trimmedMobile.length >= 10 ? listRecentOrdersForMobile(normalizeMobile(trimmedMobile), 4) : [];

  return (
    <>
      <PageHeader
        eyebrow="Deliveries"
        title="Track your order"
        description="The reference is in your confirmation message and looks like AMW-2026-4F7K2. Add the mobile number you ordered with and we will show you the live status."
        breadcrumb={[{ name: "Home", href: "/" }, { name: "Track order" }]}
      />

      <div className="shop-shell py-10 md:py-14">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:gap-14">
          <div>
            <form action="/track" method="get" className="card-surface p-5 sm:p-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">Look it up</h2>
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-medium text-ink-soft">Order reference</span>
                  <input
                    name="ref"
                    defaultValue={trimmedRef}
                    placeholder="AMW-2026-4F7K2"
                    autoComplete="off"
                    spellCheck={false}
                    className="h-11 w-full rounded-[var(--radius-sm)] border border-line bg-paper px-3 text-[14px] uppercase tracking-[0.04em] text-ink placeholder:normal-case placeholder:tracking-normal placeholder:text-muted focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-brass/15"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-medium text-ink-soft">Mobile number</span>
                  <input
                    name="mobile"
                    defaultValue={trimmedMobile}
                    inputMode="numeric"
                    placeholder="98250 41188"
                    autoComplete="tel"
                    className="h-11 w-full rounded-[var(--radius-sm)] border border-line bg-paper px-3 text-[14px] text-ink placeholder:text-muted focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-brass/15"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="mt-4 flex h-11 w-full items-center justify-center rounded-[var(--radius-sm)] bg-ink text-[12px] font-semibold uppercase tracking-[0.09em] text-bone transition-colors hover:bg-ink-soft"
              >
                Find my order
              </button>
              <p className="mt-3.5 flex items-start gap-2 text-[12px] leading-relaxed text-muted">
                <IconInfo size={14} className="mt-0.5 shrink-0 text-brass" />
                No account needed. The reference plus your number is the whole proof — that is also why we do not show the address to anyone else.
              </p>
            </form>

            {lookup.kind === "notfound" || lookup.kind === "unmatched" ? (
              <div role="alert" className="mt-4 rounded-[var(--radius-md)] border border-bad/25 bg-bad-tint px-4 py-3.5 text-[13px] leading-relaxed text-bad">
                {lookup.kind === "notfound" ? (
                  <>
                    Nothing matches <strong className="font-semibold">{trimmedRef}</strong>. Check for a typo in the reference, or ask us on{" "}
                    <a className="underline underline-offset-2" href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer noopener">
                      WhatsApp
                    </a>{" "}
                    and we will read it out to you.
                  </>
                ) : (
                  <>
                    That reference exists, but the mobile number does not match the one on the order. Try the number the parcel was booked with.
                  </>
                )}
              </div>
            ) : null}
          </div>

          <div>
            {lookup.kind === "found" && lookup.order ? (
              <div className="animate-rise rounded-[var(--radius-md)] border border-line bg-paper p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow mb-1.5">Found</p>
                    <h3 className="font-display text-[22px] leading-tight text-ink">{lookup.order.status.replace(/_/g, " ")}</h3>
                    <p className="mt-1 text-[13px] text-muted">
                      {lookup.order.customerName} · {lookup.order.itemCount} {lookup.order.itemCount === 1 ? "piece" : "pieces"}
                    </p>
                  </div>
                  <Link
                    href={`/order/${lookup.order.publicRef}`}
                    className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-line px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:border-ink"
                  >
                    Full details
                  </Link>
                </div>
                <ol className="mt-5 space-y-2.5 border-t border-line pt-4 text-[13px] text-graphite">
                  {lookup.order.items.slice(0, 4).map((item, index) => (
                    <li key={index} className="flex items-baseline justify-between gap-4">
                      <span className="truncate">
                        {item.name}
                        {item.size ? ` · ${item.size}` : ""}
                      </span>
                      <span className="nums shrink-0 text-muted">× {item.qty}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : mine.length > 0 ? (
              <section aria-label={customer ? "Your recent orders" : "Recent orders on this number"}>
                <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">
                  {customer ? "Your recent orders" : "Recent orders on that number"}
                </h2>
                <ul className="space-y-3.5">
                  {mine.map((order) => (
                    <li key={order.id}>
                      <OrderCard order={order} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <section className="rounded-[var(--radius-md)] border border-line bg-bone p-6">
                <h2 className="text-[15px] font-semibold text-ink">Nothing to show yet</h2>
                <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-muted">
                  Orders appear here the moment they are placed. If you ordered in the shop with a card receipt, we may not have a reference for it — message us
                  and we will add one.
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <Link href="/shop" className="inline-flex h-10 items-center rounded-[var(--radius-sm)] bg-ink px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-bone transition-colors hover:bg-ink-soft">
                    Shop the rail
                  </Link>
                  <a
                    href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Hello, I need help tracking an order.")}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-line px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:border-ink"
                  >
                    <IconWhatsapp size={15} /> Ask on WhatsApp
                  </a>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
