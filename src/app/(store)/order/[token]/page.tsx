import type { Metadata } from "next";
import Link from "next/link";
import { OrderTimeline } from "@/components/order/order-timeline";
import { CancelOrder } from "@/components/order/cancel-order";
import { StatusPill } from "@/components/ui/badge";
import { SafeImage } from "@/components/ui/safe-image";
import { EmptyState } from "@/components/ui/empty-state";
import { IconCheck, IconMail, IconTruck, IconWhatsapp } from "@/components/ui/icons";
import { getOrderByRef } from "@/server/repositories/orders.repository";
import { currentCustomer } from "@/server/security/guard";
import { getSettings } from "@/server/queries";
import { customerConfirmationLink } from "@/server/services/notifications.service";
import { formatDate, formatDateTime, money } from "@/lib/format";
import { statusLabel } from "@/lib/order-status";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { token } = await params;
  const order = getOrderByRef(decodeURIComponent(token));
  return {
    title: order ? `Order ${order.publicRef}` : "Track your order",
    description: order
      ? `Status, delivery address and timeline for order ${order.publicRef} at Mens Wear.`
      : "Enter your order reference and mobile number to see where your parcel is.",
    robots: { index: false, follow: false },
    openGraph: { title: `Order ${order?.publicRef ?? ""}`, url: absoluteUrl(`/order/${token}`) },
  };
}

export default async function OrderPage({ params }: { params: Params }) {
  const { token } = await params;
  const ref = decodeURIComponent(token).trim();
  const order = getOrderByRef(ref);
  const settings = getSettings();
  const customer = await currentCustomer();

  if (!order) {
    return (
      <div className="shop-shell py-16">
        <EmptyState
          icon={<IconTruck size={22} />}
          title="We could not find that order"
          description={`Nothing matches the reference ${ref}. Links from your SMS or email work even after you clear your browser, so try the original message — or look it up by number.`}
          action={
            <div className="flex flex-wrap justify-center gap-2.5">
              <Link href="/track" className="inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-ink px-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-bone transition-colors hover:bg-ink-soft">
                Track by number
              </Link>
              <a
                href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Order reference not working: ${ref}`)}`}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-line px-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:border-ink"
              >
                <IconWhatsapp size={15} /> Message us
              </a>
            </div>
          }
        />
      </div>
    );
  }

  const mine = customer ? customer.id === order.customerId : false;
  const confirmationLink = customerConfirmationLink(settings, { publicRef: order.publicRef, customerName: order.customerName, total: order.total });
  const justPlaced = order.status === "placed";

  return (
    <div className="shop-shell py-8 md:py-12">
      <div className="mx-auto max-w-[1000px]">
        {justPlaced ? (
          <header className="animate-rise rounded-[var(--radius-md)] border border-good/25 bg-good-tint px-5 py-6 sm:px-7">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-good">
              <IconCheck size={14} /> Order placed
            </p>
            <h1 className="mt-2.5 font-display text-[clamp(1.7rem,1.3rem+1.5vw,2.4rem)] leading-[1.1] text-ink">
              Thank you, {order.customerName.split(" ")[0]} — it is with us.
            </h1>
            <p className="mt-2.5 max-w-[64ch] text-[14px] leading-[1.7] text-ink-soft">
              Reference <strong className="font-semibold">{order.publicRef}</strong>. We will confirm the sizes by phone before packing; nothing has been
              charged. Keep the number {order.customerMobile} reachable.
            </p>
            {order.expectedDeliveryAt ? (
              <p className="mt-3 flex items-center gap-2 text-[13px] text-graphite">
                <IconTruck size={15} className="text-brass" />
                Expected around <strong className="font-semibold text-ink">{formatDate(order.expectedDeliveryAt)}</strong>
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link href="/shop" className="inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-ink px-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-bone transition-colors hover:bg-ink-soft">
                Continue shopping
              </Link>
              {confirmationLink ? (
                <a
                  href={confirmationLink}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-ink/20 bg-paper px-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:border-ink"
                >
                  <IconWhatsapp size={15} /> Send it to the shop
                </a>
              ) : null}
            </div>
          </header>
        ) : (
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
            <div>
              <p className="eyebrow mb-2">Order {order.publicRef}</p>
              <h1 className="font-display text-[clamp(1.6rem,1.3rem+1.3vw,2.2rem)] leading-[1.12] text-ink">
                {statusLabel(order.status)}
              </h1>
              <p className="mt-2 text-[13px] text-muted">Placed {formatDateTime(order.placedAt)} · {order.itemCount} {order.itemCount === 1 ? "piece" : "pieces"}</p>
            </div>
            <StatusPill tone={order.status === "delivered" ? "good" : order.status === "cancelled" ? "bad" : "brass"}>
              {order.status.replace(/_/g, " ")}
            </StatusPill>
          </header>
        )}

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-10">
          <div className="space-y-8">
            <section aria-label="Items" className="card-surface overflow-hidden">
              <h2 className="border-b border-line px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">In this parcel</h2>
              <ul className="divide-y divide-line-soft">
                {order.items.map((item, index) => (
                  <li key={`${item.name}-${index}`} className="flex items-center gap-3.5 px-5 py-3.5">
                    <SafeImage src={item.image ?? ""} alt="" className="h-[62px] w-[48px] shrink-0 rounded-[var(--radius-xs)] bg-sand" sizes="48px" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] text-ink">
                        {item.slug ? (
                          <Link href={`/product/${item.slug}`} className="transition-colors hover:text-brass-deep">
                            {item.name}
                          </Link>
                        ) : (
                          item.name
                        )}
                      </p>
                      <p className="mt-0.5 text-[12px] text-muted">
                        {item.size ? `Size ${item.size}` : "One size"}
                        {item.color ? ` · ${item.color}` : ""} · {item.qty} pc
                        {item.sku ? <span className="nums"> · {item.sku}</span> : null}
                      </p>
                    </div>
                    <span className="nums shrink-0 text-[13px] text-ink-soft">{money(item.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <dl className="space-y-2 border-t border-line bg-paper px-5 py-4 text-[13px]">
                <Row term="Subtotal" value={money(order.subtotal)} />
                {order.discount > 0 ? <Row term="Discount" value={`− ${money(order.discount)}`} tone="good" /> : null}
                <Row term="Delivery" value={order.shipping === 0 ? "Free" : money(order.shipping)} />
                {order.codFee > 0 ? <Row term="COD handling" value={money(order.codFee)} /> : null}
                <div className="flex items-baseline justify-between border-t border-line pt-2.5">
                  <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink">Total</dt>
                  <dd className="nums font-display text-[19px] leading-none text-ink">{money(order.total)}</dd>
                </div>
              </dl>
            </section>

            <section aria-label="Progress" className="card-surface p-5 sm:p-6">
              <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">Where it is</h2>
              <OrderTimeline status={order.status} events={order.events} />
            </section>
          </div>

          <aside className="space-y-4">
            <section aria-label="Delivery address" className="card-surface p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">Delivering to</h2>
              <address className="mt-3 text-[13.5px] not-italic leading-relaxed text-ink-soft">
                <span className="font-medium text-ink">{order.address.line1}</span>
                <br />
                {order.address.line2 ? (
                  <>
                    {order.address.line2}
                    <br />
                  </>
                ) : null}
                {order.address.city}, {order.address.state} {order.address.pin}
                <br />
                {order.address.landmark ? <>Near {order.address.landmark}<br /></> : null}
                <span className="nums mt-1.5 block text-[12.5px] text-muted">{order.customerMobile}</span>
                {order.email ? <span className="mt-0.5 block text-[12.5px] text-muted">{order.email}</span> : null}
              </address>
              <p className="mt-3.5 border-t border-line pt-3 text-[12px] leading-relaxed text-muted">
                Collect the parcel in person and check the pieces before you pay the delivery partner. Once it is signed for, the order is closed.
              </p>
            </section>

            <section aria-label="Payment" className="card-surface p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">Payment</h2>
              <p className="mt-3 text-[13.5px] text-ink-soft">
                {order.paymentMethod === "cod" ? "Cash on delivery" : "Paid online"} ·{" "}
                <span className={order.paymentStatus === "paid" ? "text-good" : order.paymentStatus === "failed" ? "text-bad" : "text-muted"}>
                  {order.paymentStatus}
                </span>
              </p>
              {order.paymentMethod === "cod" ? (
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                  Keep {money(order.total)} ready. The partner rarely carries change, and we cannot accept a partial payment.
                </p>
              ) : order.paymentStatus === "paid" ? (
                <p className="mt-2 text-[12.5px] leading-relaxed text-good">Payment confirmed — thank you. We are packing it.</p>
              ) : (
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                  {order.paymentReference
                    ? `We have your reference ${order.paymentReference}. It turns to paid as soon as the amount is matched in the shop's UPI account — usually within a few hours.`
                    : "We will send you a UPI link on WhatsApp to complete the payment, and confirm the order right after."}
                </p>
              )}
            </section>

            {order.notes ? (
              <section aria-label="Your note" className="card-surface p-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">Your note to us</h2>
                <p className="mt-2.5 whitespace-pre-line text-[13px] leading-relaxed text-graphite">{order.notes}</p>
              </section>
            ) : null}

            <section className="card-surface p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">Need a change?</h2>
              <div className="mt-3 space-y-2.5 text-[13px]">
                {confirmationLink ? (
                  <a href={confirmationLink} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2 text-ink transition-colors hover:text-brass-deep">
                    <IconWhatsapp size={15} className="text-brass" /> Message the shop about this order
                  </a>
                ) : null}
                <a href={`mailto:${settings.email}?subject=${encodeURIComponent(`Order ${order.publicRef}`)}`} className="flex items-center gap-2 text-ink transition-colors hover:text-brass-deep">
                  <IconMail size={15} className="text-brass" /> Email us instead
                </a>
                <div className="border-t border-line pt-2.5">
                  <CancelOrder ref={order.publicRef} status={order.status} mobile={order.customerMobile} />
                </div>
              </div>
            </section>

            {!mine ? (
              <p className="text-[12px] leading-relaxed text-muted">
                Anyone with this link can see this order — it is your copy, so do not post it publicly.{" "}
                {customer ? null : (
                  <Link href="/account/login" className="link-line text-ink">
                    Sign in
                  </Link>
                )}
              </p>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Row({ term, value, tone }: { term: string; value: string; tone?: "good" }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{term}</dt>
      <dd className={tone === "good" ? "nums text-good" : "nums text-ink"}>{value}</dd>
    </div>
  );
}
