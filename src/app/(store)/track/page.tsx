import type { Metadata } from "next";
import Link from "next/link";
import { OrderCard } from "@/components/order/order-card";
import { PageHeader } from "@/components/layout/page-header";
import { TrackOrderForm } from "@/components/order/track-order-form";
import { IconInfo, IconWhatsapp } from "@/components/ui/icons";
import { currentCustomer } from "@/server/security/guard";
import { listOrdersForCustomer } from "@/server/repositories/orders.repository";
import { getSettings } from "@/server/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Track your order",
  description:
    "Enter your order reference and the mobile number you ordered with to see exactly where your parcel is — packed, shipped, out for delivery or delivered.",
  alternates: { canonical: "/track" },
  // A page whose whole job is proving who you are should not sit in a search index.
  robots: { index: false, follow: false },
};

/**
 * Tracking for people without an account.
 *
 * The lookup itself lives behind `POST /api/store/orders/verify` (see TrackOrderForm),
 * because a plain GET form would have written someone's mobile number into the URL. The
 * only list rendered here is the signed-in customer's own, by session id — never by a
 * number typed into a box.
 */
export default async function TrackPage() {
  const settings = getSettings();
  const customer = await currentCustomer();
  const mine = customer ? listOrdersForCustomer(customer.id, 4) : [];

  return (
    <>
      <PageHeader
        eyebrow="Deliveries"
        title="Track your order"
        description="The reference is in your confirmation message and looks like AMW-2026-XXXXXXXX. Add the mobile number you ordered with and we will show you the live status."
        breadcrumb={[{ name: "Home", href: "/" }, { name: "Track order" }]}
      />

      <div className="shop-shell py-10 md:py-14">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:gap-14">
          <div className="space-y-4">
            <TrackOrderForm />

            {customer ? (
              <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-muted">
                <IconInfo size={14} className="mt-0.5 shrink-0 text-brass" />
                You are signed in as {customer.mobile} — your own orders are listed here and in{" "}
                <Link href="/account" className="link-line text-ink">
                  your account
                </Link>
                , no reference needed.
              </p>
            ) : (
              <p className="text-[12.5px] leading-relaxed text-muted">
                Ordering again soon?{" "}
                <Link href="/account/login" className="link-line text-ink">
                  Sign in with this number
                </Link>{" "}
                and every parcel, address and saved detail waits for you here.
              </p>
            )}
          </div>

          <div>
            {mine.length > 0 ? (
              <section aria-label="Your recent orders">
                <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">Your recent orders</h2>
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
                  Orders appear here the moment they are placed. If you ordered in the shop with a card receipt, we may
                  not have a reference for it — message us and we will add one.
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <Link
                    href="/shop"
                    className="inline-flex h-10 items-center rounded-[var(--radius-sm)] bg-ink px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-bone transition-colors hover:bg-ink-soft"
                  >
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
