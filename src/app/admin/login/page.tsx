import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { Wordmark } from "@/components/layout/wordmark";
import { currentAdmin } from "@/server/security/guard";
import { getSettings } from "@/server/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Owner sign-in", robots: { index: false, follow: false } };

type Search = Promise<{ next?: string }>;

export default async function AdminLoginPage({ searchParams }: { searchParams: Search }) {
  const { next } = await searchParams;
  const admin = await currentAdmin();
  // Only a verified session gets forwarded, and only to a dashboard path.
  if (admin) redirect(next && next.startsWith("/admin") ? next : "/admin");
  const settings = getSettings();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,440px)]">
      <section className="relative hidden overflow-hidden bg-ink lg:block">
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(248,246,242,.5) 0 1px, transparent 1px 9px)",
          }}
          aria-hidden="true"
        />
        <div className="relative flex h-full flex-col justify-between p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-bone/60">{settings.shopName}</p>
          <div className="max-w-[34ch]">
            <h1 className="font-display text-[34px] leading-[1.12] text-bone">
              The counter, the rail and the ledger —
              <em className="font-light italic text-brass-tint"> in one place.</em>
            </h1>
            <p className="mt-4 text-[13.5px] leading-relaxed text-bone/65">
              Prices, stock, orders and the shop&rsquo;s own words. Everything here is what the customer sees, the moment you save it.
            </p>
          </div>
          <p className="text-[11.5px] text-bone/45">Authorised staff only · activity is logged against your account</p>
        </div>
      </section>

      <section className="flex flex-col justify-center bg-bone px-4 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-[380px]">
          <Wordmark shopName={settings.shopName} href="/admin" size="sm" />
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Owner dashboard</p>
          <h2 className="mt-2 font-display text-[26px] leading-tight text-ink">Welcome back</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            Sign in to manage the catalogue, orders and settings. The shop itself never links here.
          </p>
          <div className="mt-6">
            <AdminLoginForm next={next ?? "/admin"} />
          </div>
          <p className="mt-5 text-[11.5px] leading-relaxed text-muted">
            One owner account, created on the shop machine with{" "}
            <code className="nums rounded bg-sand px-1 py-0.5 text-[10.5px]">npm run admin:set</code>. There is no shared demo login, and five wrong
            passwords pause this account before an attacker can try a sixth.
          </p>
        </div>
      </section>
    </div>
  );
}
