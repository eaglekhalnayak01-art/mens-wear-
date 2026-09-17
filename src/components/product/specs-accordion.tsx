import { IconCheck } from "@/components/ui/icons";
import type { ProductDetail as Product } from "@/server/repositories/types";

/**
 * Fabric, care, delivery and returns in one accordion under the fold. Native
 * `<details>` — no JavaScript, keyboard-accessible, and it prints in full.
 */
export function SpecsAccordion({ product }: { product: Product }) {
  const specs = [
    product.fabric ? { term: "Fabric", detail: product.fabric } : null,
    product.subCategory ? { term: "Fit & cut", detail: product.subCategory } : null,
    product.brand ? { term: "Made by", detail: product.brand } : null,
    product.sku ? { term: "SKU", detail: product.sku } : null,
    product.category ? { term: "Category", detail: product.category.name } : null,
    product.variants.length ? { term: "Options", detail: `${product.variants.length} size/colour combinations on the shelf` } : null,
  ].filter(Boolean) as { term: string; detail: string }[];

  return (
    <section aria-label="Product details" className="mt-10 border-t border-line">
      <Item title="What it is" defaultOpen>
        <p className="text-[14px] leading-[1.75] text-graphite">
          {product.description ??
            "A piece from the Mens Wear rail — cut in our pattern room, checked on the table before it is folded, and sent in the size you picked."}
        </p>
        {specs.length > 0 ? (
          <dl className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {specs.map((spec) => (
              <div key={spec.term} className="flex gap-3 border-b border-line-soft pb-2.5">
                <dt className="w-[92px] shrink-0 text-[12.5px] uppercase tracking-[0.06em] text-muted">{spec.term}</dt>
                <dd className="text-[13.5px] text-ink-soft">{spec.detail}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Item>

      <Item title="Care">
        <p className="text-[14px] leading-[1.75] text-graphite">
          {product.care ??
            "Dry clean the first time to set the shape, then follow the label. Wash darks cold, inside out, and never tumble a linen or a wool blend — hang it and let it dry in shade."}
        </p>
        <ul className="mt-4 space-y-2">
          {[
            "First clean at a good press shop, not the corner one",
            "Cold wash, mild detergent, no bleach on colours",
            "Dry flat or on a hanger in shade — no tumble dryer",
            "Store knitwear folded, suiting on a wide wooden hanger",
          ].map((line) => (
            <li key={line} className="flex gap-2.5 text-[13.5px] text-ink-soft">
              <IconCheck size={15} className="mt-0.5 shrink-0 text-brass" />
              {line}
            </li>
          ))}
        </ul>
      </Item>

      <Item title="Delivery, payment & exchange">
        <ul className="space-y-3 text-[14px] leading-[1.7] text-graphite">
          <li>
            <strong className="font-semibold text-ink">Dispatch.</strong> Packed and handed to the courier within two working days. You get a tracking number
            on WhatsApp the moment it moves.
          </li>
          <li>
            <strong className="font-semibold text-ink">Delivery.</strong> Two to five days across India, tracked and insured. Free above ₹1,999, otherwise ₹79.
          </li>
          <li>
            <strong className="font-semibold text-ink">Payment.</strong> Cash on delivery or UPI/card. Nothing is charged before the order is confirmed, and we
            never ask for card details on WhatsApp.
          </li>
          <li>
            <strong className="font-semibold text-ink">Exchange.</strong> Seven days to exchange a size, first courier leg on us. Unworn, tags on, and the
            invoice copy in the parcel.
          </li>
        </ul>
      </Item>

      <Item title="Why this price">
        <p className="text-[14px] leading-[1.75] text-graphite">
          We buy the cloth ourselves and stitch in-house, so the number on the tag is fabric plus labour plus a fair margin — no licensing, no showroom rent on
          the Main Road being amortised into your shirt. Where a piece is reduced, it is end-of-line or a sample, and we say so.
        </p>
      </Item>
    </section>
  );
}

function Item({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group border-b border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[13.5px] font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:text-brass-deep [&::-webkit-details-marker]:hidden">
        {title}
        <span className="relative grid h-5 w-5 place-items-center" aria-hidden="true">
          <span className="absolute h-px w-3 bg-ink" />
          <span className="absolute h-3 w-px bg-ink transition-transform duration-300 group-open:rotate-90 group-open:opacity-0" />
          <span className="absolute hidden h-3 w-px bg-ink group-open:block" />
        </span>
      </summary>
      <div className="animate-fade-up pb-5">{children}</div>
    </details>
  );
}
