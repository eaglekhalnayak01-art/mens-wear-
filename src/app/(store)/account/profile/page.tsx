import type { Metadata } from "next";
import Link from "next/link";
import { AccountTabs } from "@/components/account/account-tabs";
import { ProfileForm } from "@/components/account/profile-form";
import { AccountStat } from "@/components/account/account-tabs";
import { customerProfile } from "@/server/repositories/customers.repository";
import { requireCustomerPage } from "@/server/security/guard";
import { formatDate, maskMobile, money } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your details",
  description: "The name and email we use for invoices and delivery notes.",
  robots: { index: false, follow: false },
};

export default async function AccountProfilePage() {
  const customer = await requireCustomerPage("/account/profile");
  const profile = customerProfile(customer.id);

  return (
    <div className="shop-shell py-9 md:py-12">
      <div className="mx-auto max-w-[1000px]">
        <header className="mb-7">
          <p className="eyebrow mb-2">Account</p>
          <h1 className="font-display text-[clamp(1.7rem,1.35rem+1.3vw,2.3rem)] leading-[1.1] text-ink">Your details</h1>
        </header>

        <AccountTabs pathname="/account/profile" counts={{ orders: profile?.orders, addresses: profile?.addresses.length }} />

        <div className="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_290px] lg:gap-10">
          <ProfileForm name={profile?.name ?? ""} mobile={customer.mobile} email={profile?.email ?? ""} />

          <aside className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <AccountStat label="Orders" value={profile?.orders ?? 0} />
              <AccountStat label="Spent" value={money(profile?.spent ?? 0)} />
            </div>

            <section className="card-surface p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">What we hold</h2>
              <dl className="mt-3 space-y-2.5 text-[13px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Mobile</dt>
                  <dd className="nums text-ink-soft">{maskMobile(customer.mobile)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Email</dt>
                  <dd className="truncate text-ink-soft">{profile?.email || "not given"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Joined</dt>
                  <dd className="text-ink-soft">{profile?.createdAt ? formatDate(profile.createdAt) : "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Addresses</dt>
                  <dd className="text-ink-soft">{profile?.addresses.length ?? 0}</dd>
                </div>
              </dl>
              <p className="mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-muted">
                Want a copy or it deleted?{" "}
                <Link href="/contact" className="link-line text-ink">
                  Write to us
                </Link>{" "}
                and we will handle it by hand — no ticket system, no waiting.
              </p>
            </section>

            <section className="rounded-[var(--radius-md)] border border-line bg-bone p-5">
              <h2 className="text-[13px] font-semibold text-ink">Sizes on file</h2>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                We note the sizes you keep buying so the shop can call you with your usual fit. Nothing here is asked of you at checkout — it is written from
                what you ordered.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
