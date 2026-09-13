import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/layout/contact-form";
import { SafeImage } from "@/components/ui/safe-image";
import { IconClock, IconExternal, IconMail, IconPhone, IconPin, IconWhatsapp } from "@/components/ui/icons";
import { getSettings } from "@/server/queries";
import { FAQS } from "@/lib/shop-content";
import { fullAddress } from "@/server/repositories/settings.repository";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Contact & directions",
  description:
    "Call, WhatsApp or write to Aakash Men's Wear in Surat. Shop hours, directions, bulk enquiries and order help — a real person answers all of it.",
  alternates: { canonical: "/contact" },
  openGraph: { title: "Contact Aakash Men's Wear", url: absoluteUrl("/contact") },
};

export default function ContactPage() {
  const settings = getSettings();
  const address = fullAddress(settings);
  const telHref = `tel:${settings.phone.replace(/\s/g, "")}`;

  return (
    <div className="shop-shell py-10 md:py-14">
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
        <div>
          <p className="eyebrow mb-3">Talk to us</p>
          <h1 className="display text-[clamp(2rem,1.5rem+2.2vw,3rem)] leading-[1.06] text-ink">
            Ask before you buy.
            <br />
            <em className="font-light italic text-brass-deep">That is what the shop is for.</em>
          </h1>
          <p className="mt-4 max-w-[58ch] text-[14.5px] leading-[1.75] text-graphite">
            Sizes, fabric, alterations, a delivery that has not moved — write here, or WhatsApp a photo of what you are after. We would rather talk you out of
            the wrong shirt than take the money.
          </p>

          <div className="mt-8">
            <ContactForm whatsapp={settings.whatsapp} whatsappEnabled={settings.whatsappEnabled} />
          </div>

          <section aria-label="Common questions" className="mt-14">
            <h2 className="section-title mb-6 text-[clamp(1.35rem,1.15rem+0.8vw,1.75rem)]">Asked most often</h2>
            <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
              {FAQS.map((faq) => (
                <div key={faq.q}>
                  <dt className="text-[14px] font-semibold leading-snug text-ink">{faq.q}</dt>
                  <dd className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{faq.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside className="space-y-4 lg:pt-[74px]">
          <section className="overflow-hidden rounded-[var(--radius-md)] border border-line">
            <SafeImage src="/images/banner-tailoring.jpg" alt="The tailoring bench inside the shop" className="aspect-[4/3] w-full" sizes="(max-width:1024px) 100vw, 360px" priority={false} />
            <div className="bg-paper p-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">The shop</h2>
              <address className="mt-2.5 text-[14px] not-italic leading-relaxed text-ink">{address}</address>
              <p className="mt-3 flex items-start gap-2 border-t border-line pt-3 text-[13px] leading-relaxed text-graphite">
                <IconClock size={15} className="mt-0.5 shrink-0 text-brass" />
                {settings.hours}
              </p>
            </div>
          </section>

          <section className="card-surface p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">Direct lines</h2>
            <ul className="mt-3.5 space-y-3 text-[13.5px]">
              <li>
                <a href={telHref} className="group flex items-center justify-between gap-3 text-ink transition-colors hover:text-brass-deep">
                  <span className="flex items-center gap-2.5">
                    <IconPhone size={15} className="text-brass" /> Shop line
                  </span>
                  <span className="nums">{settings.phone}</span>
                </a>
              </li>
              {settings.whatsappEnabled ? (
                <li>
                  <a
                    href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group flex items-center justify-between gap-3 text-ink transition-colors hover:text-brass-deep"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconWhatsapp size={15} className="text-brass" /> WhatsApp
                    </span>
                    <span className="nums">{settings.whatsapp}</span>
                  </a>
                </li>
              ) : null}
              <li>
                <a href={`mailto:${settings.email}`} className="group flex items-center justify-between gap-3 text-ink transition-colors hover:text-brass-deep">
                  <span className="flex items-center gap-2.5">
                    <IconMail size={15} className="text-brass" /> Email
                  </span>
                  <span className="truncate">{settings.email}</span>
                </a>
              </li>
              <li>
                <a href={settings.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer noopener" className="group flex items-center justify-between gap-3 text-ink transition-colors hover:text-brass-deep">
                  <span className="flex items-center gap-2.5">
                    <IconPin size={15} className="text-brass" /> Directions
                  </span>
                  <IconExternal size={13} className="text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              </li>
            </ul>
          </section>

          <section className="rounded-[var(--radius-md)] border border-line bg-bone p-5">
            <h2 className="text-[13px] font-semibold text-ink">Bulk, gifting or shop stock</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Corporate shirts, wedding parties, retailer orders — we quote on cloth, count and delivery window. Put it in the message and pick “Bulk” above.
            </p>
            <Link href="/shop?sort=popular" className="mt-3.5 inline-block text-[12px] font-semibold uppercase tracking-[0.08em] text-brass-deep transition-colors hover:text-ink">
              Browse what we usually supply →
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
