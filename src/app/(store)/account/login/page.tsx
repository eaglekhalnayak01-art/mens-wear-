import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OtpLoginForm } from "@/components/account/otp-login";
import { IconCheck, IconLock, IconShield } from "@/components/ui/icons";
import { currentCustomer } from "@/server/security/guard";
import { getSettings } from "@/server/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Aakash Men's Wear with a one-time code sent to your mobile number. No password to remember.",
  robots: { index: false, follow: false },
};

type Search = Promise<{ next?: string }>;

const PERKS = [
  "Your past orders, sizes and alterations in one place",
  "Saved addresses — checkout becomes two taps",
  "Status and tracking for everything you have ordered",
];

export default async function AccountLoginPage({ searchParams }: { searchParams: Search }) {
  const { next } = await searchParams;
  const customer = await currentCustomer();
  const settings = getSettings();

  // Someone already signed in has no business on this page.
  if (customer) redirect(next && next.startsWith("/") ? next : "/account");

  const target = next && next.startsWith("/") ? next : "/account";

  return (
    <div className="narrow-shell py-12 md:py-16">
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_300px] md:gap-12">
        <div>
          <p className="eyebrow mb-2.5">Your account</p>
          <h1 className="font-display text-[clamp(1.9rem,1.4rem+1.8vw,2.6rem)] leading-[1.08] text-ink">
            One number.
            <br />
            <em className="font-light italic text-brass-deep">One code.</em>
          </h1>
          <p className="mt-3.5 max-w-[46ch] text-[14px] leading-[1.7] text-graphite">
            You can keep ordering as a guest forever — this is only for when you want your orders and addresses in one place.
          </p>

          <div className="mt-7">
            <OtpLoginForm next={target} />
          </div>
        </div>

        <aside className="space-y-6 md:pt-[86px]">
          <section aria-label="What signing in does">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">What you get</h2>
            <ul className="mt-3 space-y-2.5">
              {PERKS.map((perk) => (
                <li key={perk} className="flex gap-2.5 text-[13px] leading-relaxed text-graphite">
                  <IconCheck size={15} className="mt-0.5 shrink-0 text-good" />
                  {perk}
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Privacy" className="rounded-[var(--radius-md)] border border-line bg-paper p-4">
            <h2 className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
              <IconShield size={15} className="text-brass" /> What we keep
            </h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              Your name, number and the addresses you choose to save. No passwords, no card details, nothing sold or shared. Codes are hashed and expire in ten
              minutes.
            </p>
            <p className="mt-3 flex items-start gap-2 border-t border-line pt-3 text-[12px] leading-relaxed text-muted">
              <IconLock size={13} className="mt-0.5 shrink-0 text-brass" />
              Staff never ask for your code. If anyone calls and asks for it, that is a scam — hang up and call the shop back on {settings.phone}.
            </p>
          </section>

          <p className="text-[12.5px] leading-relaxed text-muted">
            Ordering in store? Ask us to link it to this number and it will show up here.{" "}
            <Link href="/policies/privacy" className="link-line text-ink">
              How we handle your data
            </Link>
            .
          </p>
        </aside>
      </div>
    </div>
  );
}
