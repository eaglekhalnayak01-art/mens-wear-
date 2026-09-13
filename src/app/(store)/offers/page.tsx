import type { Metadata } from "next";
import Link from "next/link";
import { ProductGrid } from "@/components/shop/product-grid";
import { SectionHeading } from "@/components/home/section-heading";
import { PageHeader } from "@/components/layout/page-header";
import { SafeImage } from "@/components/ui/safe-image";
import { getSettings, getStrip } from "@/server/queries";
import { PRICE_BANDS } from "@/lib/shop-url";
import { formatPrice } from "@/lib/format";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Special offers & reduced lots",
  description:
    "End-of-line and sample pieces from Aakash Men's Wear, priced down to clear the rail. Same fabric, same fitting, same 7-day exchange.",
  alternates: { canonical: "/offers" },
};

export default function OffersPage() {
  const settings = getSettings();
  const onSale = getStrip("sale", 12);
  const deepest = [...onSale].sort((a, b) => b.discountPct - a.discountPct).slice(0, 3);

  return (
    <>
      <PageHeader
        eyebrow="Reduced"
        title="Special offers"
        description={
          settings.offerText ||
          "End-of-line lots and sample pieces. We mark things down to clear the rail, not because the cloth is compromised — the exchange window and the alterations are the same as any other order."
        }
        breadcrumb={[{ name: "Home", href: "/" }, { name: "Offers" }]}
        meta={`${onSale.length} pieces reduced · while stock lasts`}
      />

      <section className="shop-shell py-10 md:py-12">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Shop by budget</span>
          {PRICE_BANDS.map((band) => (
            <Link
              key={band.label}
              href={`/shop?collection=sale${typeof band.min === "number" ? `&min=${band.min}` : ""}${typeof band.max === "number" ? `&max=${band.max}` : ""}`}
              className="h-8 rounded-full border border-line px-3 text-[12.5px] text-graphite transition-colors hover:border-ink hover:text-ink"
            >
              {band.label}
            </Link>
          ))}
          <Link href="/shop?collection=sale" className="h-8 rounded-full border border-line px-3 text-[12.5px] text-graphite transition-colors hover:border-ink hover:text-ink">
            All reduced pieces
          </Link>
        </div>
      </section>

      {deepest.length > 0 ? (
        <section aria-label="Deepest cuts" className="shop-shell pb-12">
          <div className="grid gap-4 sm:grid-cols-3">
            {deepest.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.slug}`}
                className="group relative flex min-h-[220px] flex-col justify-end overflow-hidden rounded-[var(--radius-md)] bg-ink p-5"
              >
                <SafeImage
                  src={product.image.src}
                  alt=""
                  className="absolute inset-0 h-full w-full opacity-45 transition-transform duration-[900ms] ease-[cubic-bezier(.22,.61,.36,1)] group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 33vw"
                  imgClassName="object-cover"
                />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/50 to-transparent" />
                <span className="nums relative w-fit rounded-full bg-brass-deep px-2.5 py-1 text-[11px] font-semibold text-bone">
                  {product.discountPct}% off
                </span>
                <h3 className="relative mt-3 text-[17px] leading-snug text-bone">{product.name}</h3>
                <p className="nums relative mt-1.5 flex items-baseline gap-2 text-bone/85">
                  <span className="text-[16px] font-semibold">{formatPrice(product.price)}</span>
                  {product.compareAtPrice ? <s className="text-[12.5px] text-bone/50">{formatPrice(product.compareAtPrice)}</s> : null}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="border-t border-line bg-paper py-14 md:py-18">
        <div className="shop-shell">
          <SectionHeading
            eyebrow="Clearing the rail"
            title="Everything reduced"
            description="Sorted by how deep the cut is. Sizes are the ones still on the shelf today."
            href="/shop?collection=sale&sort=discount"
            hrefLabel="Filter and sort"
            className="mb-8"
          />
          {onSale.length > 0 ? (
            <ProductGrid products={onSale} columns={4} />
          ) : (
            <p className="max-w-[52ch] text-[14.5px] leading-relaxed text-muted">
              Nothing is marked down at the moment — the last lot sold through. New pieces land most Fridays, and the first ones to arrive are usually the
              ones that get reduced in a few months.{" "}
              <Link href="/shop" className="link-line text-ink">
                Browse the full rail
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      <section className="shop-shell py-12">
        <div className="grid gap-4 rounded-[var(--radius-md)] border border-line bg-bone p-6 sm:grid-cols-3 sm:p-8">
          <OfferNote title="No code, no minimum" text="The price you see already includes the reduction. There is no coupon to remember and no cart minimum to unlock it." />
          <OfferNote title="Same exchange window" text="Seven days to exchange a size, first courier leg on us. Reduced does not mean final sale." />
          <OfferNote title="Alteration included" text="Hemming, waist and sleeve adjustments on reduced suiting and kurtas are free, as they are on full-price pieces." />
        </div>
      </section>
    </>
  );
}

function OfferNote({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{text}</p>
    </div>
  );
}
