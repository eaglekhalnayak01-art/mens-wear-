import Link from "next/link";
import { getCategories, getSettings } from "@/server/queries";
import { fullAddress } from "@/server/repositories/settings.repository";
import { Wordmark } from "@/components/layout/wordmark";
import { IconFacebook, IconInstagram, IconMail, IconPhone, IconPin, IconWhatsapp } from "@/components/ui/icons";
import { money } from "@/lib/format";

const QUICK_LINKS = [
  { label: "Shop all", href: "/shop" },
  { label: "New arrivals", href: "/collections/new-arrivals" },
  { label: "Best sellers", href: "/collections/best-sellers" },
  { label: "Sale & offers", href: "/collections/sale" },
  { label: "Track your order", href: "/track" },
  { label: "Your account", href: "/account" },
];

const POLICY_LINKS = [
  { label: "Shipping policy", href: "/policies/shipping" },
  { label: "Return & exchange", href: "/policies/returns" },
  { label: "Privacy policy", href: "/policies/privacy" },
  { label: "Terms & conditions", href: "/policies/terms" },
  { label: "Security & safe shopping", href: "/security" },
];

export function SiteFooter() {
  const settings = getSettings();
  const categories = getCategories().filter((c) => c.parent_id === null).slice(0, 12);
  const digits = settings.whatsapp.replace(/\D/g, "");
  const waHref = settings.whatsappEnabled && digits.length >= 10 ? `https://wa.me/91${digits.slice(-10)}` : null;

  return (
    <footer className="mt-20 border-t border-line bg-paper">
      <div className="shop-shell py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr] lg:grid-cols-[1.6fr_1fr_1fr_1.1fr]">
          <div>
            <Wordmark shopName={settings.shopName} logoImage={settings.logoImage} size="md" />
            <p className="mt-4 max-w-[46ch] text-[13.5px] leading-relaxed text-muted">{settings.tagline}.</p>
            <div className="mt-5 space-y-2 text-[13px] text-ink-soft">
              <p className="flex items-start gap-2.5">
                <IconPin size={15} className="mt-[3px] shrink-0 text-muted" />
                <span>{fullAddress(settings)}</span>
              </p>
              <p className="flex items-center gap-2.5">
                <IconPhone size={15} className="shrink-0 text-muted" />
                <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="link-line nums">{settings.phone}</a>
              </p>
              <p className="flex items-center gap-2.5">
                <IconMail size={15} className="shrink-0 text-muted" />
                <a href={`mailto:${settings.email}`} className="link-line">{settings.email}</a>
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2">
              {settings.instagram ? (
                <a href={settings.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink transition-colors hover:border-ink hover:bg-sand">
                  <IconInstagram size={16} />
                </a>
              ) : null}
              {settings.facebook ? (
                <a href={settings.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink transition-colors hover:border-ink hover:bg-sand">
                  <IconFacebook size={16} />
                </a>
              ) : null}
              {waHref ? (
                <a href={waHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink transition-colors hover:border-ink hover:bg-sand">
                  <IconWhatsapp size={16} />
                </a>
              ) : null}
            </div>
          </div>

          <nav aria-label="Shop">
            <h2 className="eyebrow">Shop</h2>
            <ul className="mt-4 space-y-2.5 text-[13.5px]">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-ink-soft transition-colors hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Categories">
            <h2 className="eyebrow">Categories</h2>
            <ul className="mt-4 space-y-2.5 text-[13.5px]">
              {categories.slice(0, 8).map((category) => (
                <li key={category.slug}>
                  <Link href={`/collections/${category.slug}`} className="text-ink-soft transition-colors hover:text-ink">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Help and policies">
            <h2 className="eyebrow">Help</h2>
            <ul className="mt-4 space-y-2.5 text-[13.5px]">
              {POLICY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-ink-soft transition-colors hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/contact" className="text-ink-soft transition-colors hover:text-ink">
                  Contact & store hours
                </Link>
              </li>
            </ul>
            <p className="mt-5 text-[12.5px] leading-relaxed text-muted">
              {settings.footerNote || `Free delivery on orders above ${money(settings.freeDeliveryOver)}.`}
            </p>
          </nav>
        </div>
      </div>

      <div className="border-t border-line-soft">
        <div className="shop-shell flex flex-col items-center justify-between gap-3 py-5 text-[12px] text-muted sm:flex-row">
          <p>
            © {new Date().getFullYear()} {settings.shopName}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-good" /> Cash on delivery
            </span>
            <span>UPI / card on checkout</span>
            <span>GSTIN {settings.gstNumber}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
