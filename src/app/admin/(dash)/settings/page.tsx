import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/page-bits";
import { SettingsForm } from "@/components/admin/settings-form";
import { IconArrowUpRight, IconShield } from "@/components/ui/icons";
import { readSettings } from "@/server/repositories/settings.repository";
import { POLICY_PAGES } from "@/lib/policies";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default async function AdminSettingsPage() {
  const settings = readSettings();

  return (
    <div className="py-6 sm:py-8">
      <div className="admin-shell max-w-[980px]">
        <AdminPageHeader
          title="Settings"
          description="The shop’s own words and rules. Save once and the storefront, the cart quotes, the policies and the footer all pick it up — there is no second copy to remember."
          actions={
            <Link href="/" target="_blank" rel="noreferrer noopener" className="admin-chip h-9 px-3 text-[12.5px]">
              View the shop <IconArrowUpRight size={12} />
            </Link>
          }
        />

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          <SettingsForm settings={{ ...settings }} />

          <aside className="space-y-4">
            <section className="admin-card p-4">
              <h2 className="admin-section-title">Policy pages</h2>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                The four texts below are what customers see under {"/policies"} — edit them in the last group.
              </p>
              <ul className="mt-3 space-y-1.5">
                {Object.entries(POLICY_PAGES).map(([slug, page]) => (
                  <li key={slug} className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="truncate text-graphite">{page.title}</span>
                    <Link href={`/policies/${slug}`} target="_blank" rel="noreferrer noopener" className="shrink-0 text-muted underline decoration-line underline-offset-2 hover:text-ink">
                      view
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="admin-card p-4">
              <h2 className="flex items-center gap-1.5 admin-section-title">
                <IconShield size={13} /> Not stored here
              </h2>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                Customer passwords do not exist — sign-in is a one-time password on the mobile number. This dashboard is a single owner account, and its
                credentials live in the database, hashed.
              </p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
                Payment keys, SMS credentials and the like belong in <code className="rounded bg-sand px-1 py-0.5 text-[10.5px]">.env.local</code>, never in a
                setting a browser can read.
              </p>
            </section>

            <section className="admin-card p-4">
              <h2 className="admin-section-title">Placeholders</h2>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                Inside policy text you can use <code className="rounded bg-sand px-1 py-0.5 text-[10.5px]">{"{shopName}"}</code>,{" "}
                <code className="rounded bg-sand px-1 py-0.5 text-[10.5px]">{"{returnWindowDays}"}</code>,{" "}
                <code className="rounded bg-sand px-1 py-0.5 text-[10.5px]">{"{deliveryFee}"}</code> and any other key on this page — they are filled in when the
                page renders.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
