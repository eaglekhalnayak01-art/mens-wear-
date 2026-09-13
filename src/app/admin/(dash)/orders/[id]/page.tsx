import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/page-bits";
import { OrderStatusEditor } from "@/components/admin/order-status-editor";
import { OrderTimeline } from "@/components/order/order-timeline";
import { StatusPill } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { PrintButton } from "@/components/admin/print-button";
import { IconExternal, IconPhone, IconTruck, IconWhatsapp } from "@/components/ui/icons";
import { getOrderByPublicId } from "@/server/repositories/orders.repository";
import { getSettings } from "@/server/queries";
import { canCancel, statusMeta, type OrderStatus } from "@/lib/order-status";
import { formatDateTime, maskMobile, money } from "@/lib/format";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const order = getOrderByPublicId(Number(id));
  return { title: order ? `Order ${order.publicRef}` : "Order", robots: { index: false } };
}

export default async function AdminOrderDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric < 1) notFound();
  const order = getOrderByPublicId(numeric);
  if (!order) notFound();

  const settings = getSettings();
  const meta = statusMeta(order.status);
  const digits = settings.whatsapp.replace(/\D/g, "");
  const waHref = digits
    ? `https://wa.me/${digits.slice(-10)}?text=${encodeURIComponent(`Hello ${order.customerName}, this is ${settings.shopName} about order ${order.publicRef}.`)}`
    : null;

  return (
    <div className="py-6 sm:py-8">
      <div className="admin-shell">
        <AdminPageHeader
          title={order.publicRef}
          description={`${order.customerName} · placed ${formatDateTime(order.placedAt)} · ${order.itemCount} line${order.itemCount === 1 ? "" : "s"}`}
          actions={
            <>
              <StatusPill tone={meta.tone === "good" ? "good" : meta.tone === "bad" ? "bad" : meta.tone === "accent" ? "brass" : "quiet"}>{meta.label}</StatusPill>
              <LinkButton href="/admin/orders" variant="light" size="sm">
                All orders
              </LinkButton>
              <PrintButton />
            </>
          }
        />

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <section className="admin-card p-5">
              <h2 className="admin-section-title">In this parcel</h2>
              <ul className="mt-4 divide-y divide-line-soft">
                {order.items.map((item, index) => (
                  <li key={`${item.slug ?? "item"}-${index}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="relative block h-14 w-11 shrink-0 overflow-hidden rounded-[var(--radius-xs)] bg-sand ring-1 ring-line-soft">
                      {item.image ? <SafeImage src={item.image} alt="" sizes="44px" className="h-full w-full object-cover" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{item.name}</span>
                      <span className="nums block text-[11.5px] text-muted">
                        {[item.size ? `Size ${item.size}` : null, item.color, item.sku].filter(Boolean).join(" · ") || "—"}
                      </span>
                      {item.slug ? (
                        <Link href={`/product/${item.slug}`} className="text-[11px] text-muted underline decoration-line underline-offset-2 hover:text-ink">
                          Open the live product page
                        </Link>
                      ) : null}
                    </span>
                    <span className="nums shrink-0 text-right text-[12.5px] text-graphite">
                      {item.qty} × {money(item.unitPrice)}
                      <span className="block font-semibold text-ink">{money(item.lineTotal)}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-[12.5px]">
                {[
                  ["Subtotal", money(order.subtotal)],
                  order.discount ? ["Discount", `− ${money(order.discount)}`] : null,
                  order.shipping ? ["Delivery", money(order.shipping)] : ["Delivery", "Free"],
                  order.codFee ? ["Cash handling" , money(order.codFee)] : null,
                ]
                  .filter(Boolean)
                  .map((row) => {
                    const [label, value] = row as [string, string];
                    return (
                      <div key={label} className="flex justify-between gap-4">
                        <dt className="text-muted">{label}</dt>
                        <dd className="nums text-graphite">{value}</dd>
                      </div>
                    );
                  })}
                <div className="flex justify-between gap-4 border-t border-line pt-2">
                  <dt className="text-[13px] font-semibold text-ink">Paid by {order.paymentMethod === "cod" ? "cash on delivery" : "UPI / card"}</dt>
                  <dd className="nums text-[15px] font-semibold text-ink">{money(order.total)}</dd>
                </div>
              </dl>
            </section>

            <section className="admin-card p-5">
              <h2 className="admin-section-title">Where it goes</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[13px] font-medium text-ink">{order.customerName}</p>
                  <address className="mt-1 text-[12.5px] not-italic leading-relaxed text-graphite">
                    {order.address.line1}
                    {order.address.line2 ? <>, {order.address.line2}</> : null}
                    <br />
                    {order.address.city}, {order.address.state} {order.address.pin}
                    {order.address.landmark ? (
                      <>
                        <br />
                        <span className="text-muted">Near {order.address.landmark}</span>
                      </>
                    ) : null}
                  </address>
                  {order.address.city ? (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(
                        `${order.address.line1}, ${order.address.city}, ${order.address.state} ${order.address.pin}`,
                      )}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
                    >
                      Open in Maps <IconExternal size={11} />
                    </a>
                  ) : null}
                </div>
                <div className="space-y-2 text-[12.5px]">
                  <a href={`tel:${order.customerMobile}`} className="flex items-center gap-2 text-ink hover:underline">
                    <IconPhone size={13} className="text-muted" /> <span className="nums">{order.customerMobile}</span>
                  </a>
                  {waHref && settings.whatsappEnabled ? (
                    <a href={waHref} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2 text-good hover:underline">
                      <IconWhatsapp size={13} /> Message on WhatsApp
                    </a>
                  ) : null}
                  {order.email ? (
                    <a href={`mailto:${order.email}`} className="flex items-center gap-2 text-graphite hover:text-ink">
                      <IconExternal size={13} className="text-muted" /> {order.email}
                    </a>
                  ) : (
                    <p className="text-muted">No email on this order</p>
                  )}
                  <p className="flex items-center gap-2 text-graphite">
                    <IconTruck size={13} className="text-muted" />
                    {order.expectedDeliveryAt ? `Deliver by ${formatDateTime(order.expectedDeliveryAt)}` : "Delivery date not set"}
                  </p>
                </div>
              </div>
              {order.notes ? (
                <p className="mt-4 rounded-[var(--radius-sm)] bg-sand px-3 py-2.5 text-[12.5px] leading-relaxed text-graphite">
                  <span className="font-medium text-ink">Customer note:</span> {order.notes}
                </p>
              ) : null}
              {order.cancelledReason ? (
                <p className="mt-4 rounded-[var(--radius-sm)] border border-bad/25 bg-bad-tint px-3 py-2.5 text-[12.5px] leading-relaxed text-bad">
                  <span className="font-medium">Cancelled:</span> {order.cancelledReason}
                </p>
              ) : null}
              <p className={cn("mt-4 text-[11.5px]", order.paymentStatus === "paid" ? "text-good" : "text-muted")}>
                Payment {order.paymentStatus}
                {order.paymentMethod === "cod" ? " · collect ₹" + money(order.total) + " at the door" : ""}
                {" · mobile on file "}
                {maskMobile(order.customerMobile)}
              </p>
            </section>
          </div>

          <div className="space-y-4">
            <section className="admin-card p-5 print:hidden">
              <OrderStatusEditor
                orderId={order.id}
                status={order.status}
                paymentStatus={order.paymentStatus}
                canCancel={canCancel(order.status as OrderStatus)}
                paymentMethod={order.paymentMethod}
                paymentReference={order.paymentReference}
                shopName={settings.shopName}
              />
            </section>

            <section className="admin-card p-5">
              <h2 className="admin-section-title">Journey</h2>
              <div className="mt-4">
                <OrderTimeline status={order.status} events={order.events.map((event) => ({ status: event.status, createdAt: event.createdAt, note: event.note }))} />
              </div>
            </section>

            <section className="admin-card p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="admin-section-title">Everything that happened</h2>
                <span className="text-[11px] text-muted">{order.events.length} entries</span>
              </div>
              <ol className="mt-3 space-y-2.5">
                {order.events.map((event, index) => (
                  <li key={`${event.status}-${event.createdAt}-${index}`} className="flex items-start gap-2.5 text-[12px]">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-line" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-ink">
                        {statusMeta(event.status).label}
                        {event.actorType ? <span className="text-muted"> · {event.actorType === "admin" ? "staff" : event.actorType === "customer" ? "customer" : "system"}</span> : null}
                      </span>
                      {event.note ? <span className="block text-[11.5px] leading-relaxed text-muted">{event.note}</span> : null}
                    </span>
                    <span className="nums shrink-0 text-[11px] text-muted">{formatDateTime(event.createdAt)}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="admin-card p-5">
              <h2 className="admin-section-title">Customer link</h2>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">
                Send this to the customer — it works with no account and no password.
              </p>
              <code className="mt-2 block truncate rounded-[var(--radius-sm)] bg-sand px-2.5 py-2 text-[11.5px] text-ink">/order/{order.publicRef}</code>
              <LinkButton href={`/order/${order.publicRef}`} variant="light" size="xs" className="mt-2.5" iconRight={<IconExternal size={12} />}>
                Open tracking page
              </LinkButton>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
