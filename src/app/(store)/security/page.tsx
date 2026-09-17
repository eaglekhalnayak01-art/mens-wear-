import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { SectionHeading } from "@/components/home/section-heading";
import { Reveal } from "@/components/ui/reveal";
import {
  IconArrowRight,
  IconBox,
  IconCard,
  IconCheck,
  IconEyeOff,
  IconInfo,
  IconLock,
  IconRefresh,
  IconShield,
  IconWhatsapp,
} from "@/components/ui/icons";
import { getSettings } from "@/server/queries";
import { absoluteUrl, storeJsonLd } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Security & safe shopping",
  description:
    "How Mens Wear protects your account, your address, your orders and your payment — in plain language, with the actual controls we run.",
  alternates: { canonical: "/security" },
  openGraph: {
    title: "Security at Mens Wear",
    description: "Your orders, addresses and numbers are readable by you and by the shop while your parcel is live. Nothing more.",
    url: absoluteUrl("/security"),
  },
};

const CARDS = [
  {
    icon: IconLock,
    title: "Secure account",
    text: "Sign in with a one-time code on your mobile number, or a password of your own choosing. Passwords are stored scrambled — nobody at the shop can read yours, including the person packing your parcel.",
    point: "We never ask for your password by phone or WhatsApp.",
  },
  {
    icon: IconShield,
    title: "Privacy protection",
    text: "Your name, number and address sit on your order so the courier can reach you. They are not sold, not shared with marketers, and not shown to other shoppers anywhere on the site.",
    point: "No customer can look up another customer.",
  },
  {
    icon: IconBox,
    title: "Secure orders",
    text: "An order opens for the account that placed it — or for whoever types the reference plus the mobile number on it. A reference on its own is not enough, because references end up in group chats.",
    point: "Tracking needs both halves, or your sign-in.",
  },
  {
    icon: IconCard,
    title: "Payment protection",
    text: "Prices are worked out on our server, never taken from your browser. Online payment goes to the shop's own UPI handle or a payment gateway — card numbers never pass through or rest on our systems.",
    point: "No card data is stored here, ever.",
  },
  {
    icon: IconEyeOff,
    title: "Personal data, minimised",
    text: "We ask for what a delivery needs: a name, a number, an address, and nothing else. Date of birth, Aadhaar, PAN and ID photos are not collected for an order.",
    point: "You can ask us to forget you; we will.",
  },
  {
    icon: IconRefresh,
    title: "Authentication security",
    text: "Sessions expire on their own, signing out kills the token behind the cookie, and changing your password closes every other device at once. Five wrong tries pause a login before a sixth can be attempted.",
    point: "Signed out is signed out, everywhere.",
  },
];

const ACCOUNT_SAFETY = [
  "Never share a one-time code with anyone — not with us, not with a caller claiming to be us. Our staff will never ask for it.",
  "If a call or message asks you to “verify” by reading out a code or installing screen-share, hang up and call the shop number on this site.",
  "On a shared or work phone, sign out after you order. Closing the tab is not signing out.",
  "Use a password you do not reuse anywhere else. Twelve characters beat eight clever ones.",
  "Keep the mobile number on your account current — that number is how we confirm an order is yours.",
  "If your phone is lost, tell us and we will hold deliveries and block sign-ins until you have a new number on the account.",
];

const ORDER_SECURITY = [
  {
    title: "Reading an order",
    text: "The order page shows a name, a phone number and a front door. So it opens for the signed-in account that owns it, or for a link we minted ourselves at checkout, or after you type the reference plus the mobile on the order. Guessing a reference does nothing: the page shows a blank form and no order data.",
  },
  {
    title: "Changing or cancelling",
    text: "Cancellation is refused once a parcel has moved, and it is refused for anyone who cannot prove the number on the order. Nothing on the site lets one customer edit, cancel or delete another customer's order — the check runs on the server, before the database is touched.",
  },
  {
    title: "Addresses",
    text: "Saved addresses belong to the signed-in account. Editing or deleting one by guessing its number fails, even if the request is crafted by hand — the shop answers “that address is not in your account” rather than pretending it saved.",
  },
];

const PAYMENT_SECURITY = [
  {
    title: "What we can see",
    text: "For cash on delivery: nothing until the courier collects. For UPI or a gateway: the reference you type, the amount and our own record of whether it was marked paid. UPI handles and payment references are for reconciling your order, and only the shop team sees them.",
  },
  {
    title: "What we never see",
    text: "Card numbers, CVV, UPI PIN, net-banking passwords and wallet PINs never reach this website. If a payment looks wrong, the fix is with your bank or UPI app — and we will co-operate with the reference from your order.",
  },
  {
    title: "Prices cannot be edited by you",
    text: "The cart you see is a preview. The total is rebuilt from live prices and stock on our server when you place the order, so a tampered price, a negative quantity or a fake discount simply does not arrive as an order.",
  },
];

export default function SecurityPage() {
  const settings = getSettings();
  const digits = settings.whatsapp.replace(/\D/g, "");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd(settings)) }} />

      <PageHeader
        eyebrow="Security"
        title="Your order, your address, your number — yours"
        description="This page is the honest list of what protects you on this shop. No guarantees of perfection, no marketing words like “unhackable”. Just the controls that are switched on, and what to do if one of them is not enough."
        breadcrumb={[{ name: "Home", href: "/" }, { name: "Security" }]}
      />

      <div className="shop-shell py-10 md:py-14">
        <Reveal>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CARDS.map((card) => (
              <li key={card.title} className="card-surface flex flex-col p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-sand text-brass-deep">
                  <card.icon size={17} />
                </span>
                <h2 className="mt-3.5 text-[15px] font-semibold text-ink">{card.title}</h2>
                <p className="mt-2 flex-1 text-[13px] leading-[1.65] text-graphite">{card.text}</p>
                <p className="mt-3.5 flex items-start gap-1.5 border-t border-line-soft pt-3 text-[12px] leading-relaxed text-muted">
                  <IconCheck size={13} className="mt-0.5 shrink-0 text-good" /> {card.point}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>

        <div className="mt-14 grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-14">
          <div className="space-y-12">
            <section aria-label="Order security">
              <SectionHeading eyebrow="Order security" title="Who can see what you ordered" />
              <ul className="mt-6 space-y-6">
                {ORDER_SECURITY.map((row) => (
                  <li key={row.title} className="border-l-2 border-brass/35 pl-4">
                    <h3 className="text-[14.5px] font-semibold text-ink">{row.title}</h3>
                    <p className="mt-1.5 max-w-[68ch] text-[13.5px] leading-[1.7] text-graphite">{row.text}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Payment security">
              <SectionHeading eyebrow="Payment security" title="Money, references and what we never touch" />
              <ul className="mt-6 space-y-6">
                {PAYMENT_SECURITY.map((row) => (
                  <li key={row.title} className="border-l-2 border-brass/35 pl-4">
                    <h3 className="text-[14.5px] font-semibold text-ink">{row.title}</h3>
                    <p className="mt-1.5 max-w-[68ch] text-[13.5px] leading-[1.7] text-graphite">{row.text}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Account security">
              <SectionHeading eyebrow="Account security" title="Six habits that keep an account yours" />
              <ol className="mt-6 grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
                {ACCOUNT_SAFETY.map((tip, index) => (
                  <li key={tip} className="flex gap-3 text-[13.5px] leading-[1.65] text-graphite">
                    <span className="nums mt-0.5 shrink-0 text-[11.5px] font-semibold text-brass-deep">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {tip}
                  </li>
                ))}
              </ol>
            </section>

            <section aria-label="Privacy and data protection">
              <SectionHeading eyebrow="Privacy & data protection" title="What we keep, how long, and how to make us delete it" />
              <div className="mt-6 space-y-4 text-[13.5px] leading-[1.75] text-graphite">
                <p>
                  We keep your name, mobile number, delivery address and order history for as long as the account exists,
                  plus the paperwork Indian law asks a shop to keep — invoices and GST records. Sign-in attempts are
                  recorded against the account so a pause can be lifted honestly, and admin actions on an order are
                  logged with the timestamp of the change.
                </p>
                <p>
                  Cookies: one for your sign-in, one for the owner&rsquo;s dashboard, and nothing for advertising. No
                  trackers, no pixels, no third-party scripts reading your cart.
                </p>
                <p>
                  Write to{" "}
                  <a href={`mailto:${settings.email}`} className="link-line text-ink">
                    {settings.email}
                  </a>{" "}
                  and we will correct what is wrong, hand you a copy of what we hold, or delete the account. Orders that
                  must stay for tax records are kept under your number without the address attached.
                </p>
              </div>
            </section>

            <section className="rounded-[var(--radius-md)] border border-line bg-bone p-5 sm:p-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">
                Authentication, exactly as it runs
              </h2>
              <ul className="mt-3.5 space-y-2.5 text-[13.5px] leading-relaxed text-graphite">
                <li className="flex gap-2.5">
                  <IconLock size={15} className="mt-0.5 shrink-0 text-brass" />
                  Sign-in is a one-time code on your mobile number, or your password. Codes expire in ten minutes and one
                  code works once.
                </li>
                <li className="flex gap-2.5">
                  <IconRefresh size={15} className="mt-0.5 shrink-0 text-brass" />
                  Your session lasts 30 days on your device and ends the moment you sign out. The shop stores only a
                  scrambled fingerprint of the session, so a stolen database copy cannot be used to sign in as you.
                </li>
                <li className="flex gap-2.5">
                  <IconShield size={15} className="mt-0.5 shrink-0 text-brass" />
                  Requests that did not come from this site are refused, so a page somewhere else cannot act as you.
                  Forms are checked for the same origin before anything changes.
                </li>
                <li className="flex gap-2.5">
                  <IconInfo size={15} className="mt-0.5 shrink-0 text-brass" />
                  What we cannot promise: that a courier partner mishandles a parcel, or that your own email or phone
                  account is secure. Those are the two ways shopping accounts actually get taken, and they are worth a
                  strong password each.
                </li>
              </ul>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <section className="card-surface p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">Something looks wrong?</h2>
              <p className="mt-2.5 text-[13px] leading-relaxed text-graphite">
                A parcel delivered to the wrong name, an order you did not place, a code you were asked to read out —
                tell us the same day and we will stop the parcel and lock sign-ins on the account.
              </p>
              <div className="mt-4 space-y-2.5">
                <a
                  href={`https://wa.me/${digits.length >= 10 ? `91${digits.slice(-10)}` : ""}?text=${encodeURIComponent(
                    "Security concern with my order — please hold it.",
                  )}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-ink px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-bone transition-colors hover:bg-ink-soft"
                >
                  <IconWhatsapp size={15} /> Message the shop
                </a>
                <Link
                  href="/contact"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-line px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:border-ink"
                >
                  Call or visit <IconArrowRight size={15} />
                </Link>
              </div>
            </section>

            <section className="card-surface p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">Useful pages</h2>
              <ul className="mt-3 space-y-2 text-[13px]">
                {[
                  { href: "/track", label: "Track an order by reference" },
                  { href: "/account", label: "My account and saved addresses" },
                  { href: "/policies/privacy", label: "Privacy policy" },
                  { href: "/policies/returns", label: "Returns & exchanges" },
                  { href: "/policies/terms", label: "Terms & conditions" },
                ].map((row) => (
                  <li key={row.href}>
                    <Link href={row.href} className="link-line text-ink-soft transition-colors hover:text-ink">
                      {row.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[var(--radius-md)] border border-brass/30 bg-brass-tint p-5">
              <h2 className="flex items-center gap-2 text-[12.5px] font-semibold text-brass-deep">
                <IconCard size={15} /> A rule worth repeating
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                We will never ask you for a UPI PIN, a card number, a CVV or a password. If someone does — even with
                your order number in their hand — that is not us.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
