import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/page-bits";
import { StatusPill } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { IconMail, IconPhone, IconPin, IconWhatsapp } from "@/components/ui/icons";
import { customerDetail } from "@/server/repositories/customers.repository";
import { getSettings } from "@/server/queries";
import { formatDate, formatDateTime, money } from "@/lib/format";
import { isTerminal, statusMeta } from "@/lib/order-status";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const detail = customerDetail(Number(id));
  return { title: detail ? (detail.name ?? detail.mobile) : "Customer", robots: { index: false } };
}

export default async function AdminCustomerPage({ params }: { params: Params }) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric < 1) notFound();
  const detail = customerDetail(numeric);
  if (!detail) notFound();

  const settings = getSettings();
  const digits = detail.mobile.replace(/\D/g, "").slice(-10);
  const name = detail.name ?? "This customer";

  return (
    <div className="py-6 sm:py-8">
      <div className="admin-shell max-w-[900px]">
        <AdminPageHeader
          title={detail.name ?? detail.mobile}
          description={
            detail.name
              ? `${detail.mobile} · account since ${formatDate(detail.createdAt)}`
              : `Mobile ${detail.mobile} · account since ${formatDate(detail.createdAt)}`
          }
          actions={
            <>
              <LinkButton href={`tel:${detail.mobile}`} variant="light" size="sm" iconLeft={<IconPhone size={13} />}>
                Call
              </LinkButton>
              {settings.whatsappEnabled && digits.length === 10 ? (
                <a
                  href={`https://wa.me/91${digits}?text=${encodeURIComponent(`Hello ${name}, this is ${settings.shopName}.`)}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-paper px-3 text-[12.5px] text-good transition-colors hover:border-good"
                >
                  <IconWhatsapp size={13} /> WhatsApp
                </a>
              ) : null}
              {detail.email ? (
                <LinkButton href={`mailto:${detail.email}`} variant="light" size="sm" iconLeft={<IconMail size={13} />}>
                  Email
                </LinkButton>
              ) : null}
            </>
          }
        />

        <section aria-label="Spending" className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: "Orders", value: String(detail.stats.orders) },
            { label: "Lifetime spend", value: money(detail.stats.spent) },
            { label: "Last order", value: detail.stats.lastOrderAt ? formatDate(detail.stats.lastOrderAt) : "—" },
          ].map((card) => (
            <div key={card.label} className="admin-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{card.label}</p>
              <p className="admin-figure mt-2 text-[20px]">{card.value}</p>
            </div>
          ))}
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="admin-card p-5">
            <h2 className="admin-section-title">Order history</h2>
            {detail.orders.length === 0 ? (
              <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
                No orders against this number yet. Guest checkouts are matched by mobile, so anything they have bought before an account existed still lands here.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line-soft">
                {detail.orders.map((order) => (
                  <li key={order.id}>
                    <Link href={`/admin/orders/${order.id}`} className="-mx-1.5 flex items-center gap-3 rounded-[var(--radius-xs)] px-1.5 py-2.5 transition-colors hover:bg-sand">
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="nums text-[12.5px] font-semibold text-ink">{order.publicRef}</span>
                          <span className="text-[11px] text-muted">{formatDateTime(order.placedAt)}</span>
                          {!isTerminal(order.status) ? <span className="text-[11px] text-brass">open</span> : null}
                        </span>
                        <span className="mt-0.5 block truncate text-[11.5px] text-muted">
                          {order.preview.replace(/ · /g, ", ")} · {order.units} pc · {order.city}
                        </span>
                      </span>
                      <StatusPill tone={statusMeta(order.status).tone === "good" ? "good" : statusMeta(order.status).tone === "bad" ? "bad" : "quiet"}>
                        {statusMeta(order.status).short}
                      </StatusPill>
                      <span className="nums w-[66px] shrink-0 text-right text-[12.5px] font-semibold text-ink">{money(order.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="space-y-4">
            <section className="admin-card p-5">
              <h2 className="admin-section-title">Addresses on file</h2>
              {detail.addresses.length === 0 ? (
                <p className="mt-3 text-[12.5px] text-muted">Nothing saved — they check out with the address typed in each time.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {detail.addresses.map((address) => (
                    <li key={address.id} className={cn("rounded-[var(--radius-sm)] border px-3 py-2.5 text-[12px] leading-relaxed", address.isDefault ? "border-ink bg-sand/60" : "border-line")}>
                      <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
                        <IconPin size={12} className="text-muted" />
                        {address.label ?? "Saved address"}
                        {address.isDefault ? <span className="text-[10.5px] font-normal text-brass">· used by default</span> : null}
                      </p>
                      <p className="mt-1 text-graphite">
                        {address.recipient ?? name}
                        {address.phone ? ` · ${address.phone}` : ""}
                        <br />
                        {address.line1}
                        {address.line2 ? `, ${address.line2}` : ""}
                        <br />
                        {address.city}, {address.state} {address.pin}
                        {address.landmark ? <br /> : null}
                        {address.landmark ? <span className="text-muted">Near {address.landmark}</span> : null}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="admin-card p-5">
              <h2 className="admin-section-title">Account</h2>
              <dl className="mt-3 space-y-2 text-[12px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Mobile</dt>
                  <dd className="nums text-ink">{detail.mobile}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Email</dt>
                  <dd className={cn("truncate", detail.email ? "text-ink" : "text-muted")}>{detail.email ?? "not given"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Signed in last</dt>
                  <dd className="text-ink">{detail.lastLoginAt ? formatDateTime(detail.lastLoginAt) : "never"}</dd>
                </div>
              </dl>
              <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed text-muted">
                Sign-in is by one-time password on the mobile number — this shop keeps no customer passwords, so there is nothing here to reset.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
