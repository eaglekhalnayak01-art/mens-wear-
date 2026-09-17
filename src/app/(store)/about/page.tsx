import type { Metadata } from "next";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { Reveal } from "@/components/ui/reveal";
import { Testimonials } from "@/components/home/testimonials";
import { SectionHeading } from "@/components/home/section-heading";
import { IconArrowRight, IconCheck, IconPhone, IconPin, IconRuler, IconWhatsapp } from "@/components/ui/icons";
import { getSettings, getStrip } from "@/server/queries";
import { ProductGrid } from "@/components/shop/product-grid";
import { BRAND_POINTS, REVIEWS, SIZE_ADVICE } from "@/lib/shop-content";
import { averageRating } from "@/lib/shop-stats";
import { fullAddress } from "@/server/repositories/settings.repository";
import { absoluteUrl, storeJsonLd } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "About the shop",
  description:
    "Mens Wear buys its own fabric, cuts in its own pattern room and checks every piece before it is folded. Since 2014 on Station Road, and online across India.",
  alternates: { canonical: "/about" },
  openGraph: { title: "About Mens Wear", description: "A shop that knows its cloth.", url: absoluteUrl("/about") },
};

const PROCESS = [
  { step: "01", title: "We buy the cloth", text: "Mill runs, weaver sheds, the Surat powerloom belt. Fabric is chosen before a single garment is designed." },
  { step: "02", title: "We cut the pattern", text: "Our own pattern room, revised every season on real bodies — not a size chart copied from a wholesale catalogue." },
  { step: "03", title: "Checked on the table", text: "Stitch, collar roll, button hole, hem. If it fails, it goes back to the tailor and not to you." },
  { step: "04", title: "Folded and sent", text: "Packed with the invoice and a spare button, handed to the courier within two working days." },
];

export default function AboutPage() {
  const settings = getSettings();
  const staples = getStrip("bestsellers", 4);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd(settings)) }} />

      <section className="border-b border-line bg-paper">
        <div className="shop-shell grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow mb-3">The shop</p>
            <h1 className="display text-[clamp(2.2rem,1.5rem+3vw,3.6rem)] leading-[1.04] text-ink">
              {settings.aboutTitle.split(" ").slice(0, -1).join(" ")}{" "}
              <em className="font-light italic text-brass-deep">{settings.aboutTitle.split(" ").slice(-1)}</em>
            </h1>
            <p className="mt-5 max-w-[56ch] text-[15.5px] leading-[1.8] text-graphite">{settings.brandStory}</p>
            <dl className="mt-8 grid max-w-[420px] grid-cols-3 gap-5 border-t border-line pt-6">
              <Figure value={settings.foundedYear} label="Founded" />
              <Figure value="2,400+" label="Garments a year" />
              <Figure value={settings.city} label="Home turf" />
            </dl>
            <div className="mt-8 flex flex-wrap gap-2.5">
              <Link href="/shop" className="group inline-flex h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-ink px-5 text-[12px] font-semibold uppercase tracking-[0.09em] text-bone transition-colors hover:bg-ink-soft">
                Shop the rail <IconArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <a
                href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(settings.whatsappGreeting || "Hello, I have a question about your shop.")}`}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-sm)] border border-line px-5 text-[12px] font-semibold uppercase tracking-[0.09em] text-ink transition-colors hover:border-ink"
              >
                <IconWhatsapp size={15} /> Ask us anything
              </a>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <SafeImage src="/images/hero-editorial.jpg" alt="Tailored suit on the shop rail" className="col-span-2 aspect-[16/10] w-full rounded-[var(--radius-xs)]" sizes="(max-width:1024px) 100vw, 46vw" />
            <SafeImage src="/images/banner-tailoring.jpg" alt="In-house tailoring bench" className="aspect-[4/5] w-full rounded-[var(--radius-xs)]" sizes="(max-width:1024px) 48vw, 22vw" priority={false} />
            <SafeImage src="/images/hero-ethnic.jpg" alt="Handloom kurtas folded on the table" className="aspect-[4/5] w-full rounded-[var(--radius-xs)]" sizes="(max-width:1024px) 48vw, 22vw" priority={false} />
          </div>
        </div>
      </section>

      <section aria-label="How a garment is made" className="shop-shell py-14 md:py-20">
        <SectionHeading eyebrow="From loom to parcel" title="Four things happen before a piece is yours" description="No drop-shipping, no white-label catalogue. This is the actual route a garment takes through our building." className="mb-10" />
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS.map((item, index) => (
            <Reveal as="li" key={item.step} delay={index * 70}>
              <p className="nums font-display text-[30px] leading-none text-ink/15">{item.step}</p>
              <h3 className="mt-3 text-[15px] font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{item.text}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-paper py-14 md:py-20">
        <div className="shop-shell grid items-start gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <p className="eyebrow mb-3">What we hold to</p>
            <h2 className="section-title">Three promises, still on the wall</h2>
            <ul className="mt-7 space-y-6">
              {BRAND_POINTS.map((point) => (
                <li key={point.title} className="flex gap-3.5">
                  <IconCheck size={17} className="mt-0.5 shrink-0 text-brass" />
                  <div>
                    <p className="text-[14.5px] font-semibold text-ink">{point.title}</p>
                    <p className="mt-1.5 max-w-[52ch] text-[13.5px] leading-relaxed text-muted">{point.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card-surface p-5 sm:p-6">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <IconRuler size={16} className="text-brass" /> How we fit a man over the phone
            </h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              Order online and we call before dispatch if anything about the fit is doubtful. Four measurements settle almost everything.
            </p>
            <dl className="mt-5 space-y-4">
              {SIZE_ADVICE.map((row) => (
                <div key={row.label} className="border-t border-line-soft pt-3.5 first:border-t-0 first:pt-0">
                  <dt className="text-[13px] font-semibold text-ink">{row.label}</dt>
                  <dd className="mt-1 text-[13px] leading-relaxed text-graphite">{row.note}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {staples.length > 0 ? (
        <section className="shop-shell py-14 md:py-18">
          <SectionHeading eyebrow="The permanent rail" title="What men come back for" description="Four pieces we restock because they never sit." href="/collections/best-sellers" className="mb-8" />
          <ProductGrid products={staples} columns={4} />
        </section>
      ) : null}

      <Testimonials reviews={REVIEWS.slice(0, 3)} average={averageRating(REVIEWS)} count={214} />

      <section className="border-t border-line bg-paper py-14">
        <div className="shop-shell grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="eyebrow mb-3">Come in</p>
            <h2 className="section-title">{fullAddress(settings)}</h2>
            <p className="mt-3 max-w-[54ch] text-[14px] leading-relaxed text-graphite">
              {settings.hours}. Fitting room, alteration bench and chai on the counter. Walk in with a photo of what you want and we will tell you honestly
              whether we can make it.
            </p>
          </div>
          <ul className="space-y-2.5 text-[13.5px]">
            <li>
              <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 text-ink transition-colors hover:text-brass-deep">
                <IconPhone size={15} className="text-brass" /> <span className="nums">{settings.phone}</span>
              </a>
            </li>
            <li>
              <a href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress(settings))}`} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 text-ink transition-colors hover:text-brass-deep">
                <IconPin size={15} className="text-brass" /> Open in Maps
              </a>
            </li>
            <li>
              <Link href="/contact" className="link-line inline-flex items-center gap-2 text-ink">
                Contact & directions
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</dt>
      <dd className="nums mt-1.5 font-display text-[19px] leading-none text-ink">{value}</dd>
    </div>
  );
}
