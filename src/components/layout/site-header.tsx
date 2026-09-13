import { getCategories, getSettings } from "@/server/queries";
import { HeaderClient } from "@/components/layout/header-client";
import type { NavCategory } from "@/components/layout/header-client";

/**
 * Storefront header. Reads shop name + categories on the server and hands the
 * client a small serialisable payload, so the chrome costs almost no JS.
 */
export function SiteHeader() {
  const settings = getSettings();
  const categories = getCategories();

  const navCategories: NavCategory[] = categories
    .filter((c) => c.parent_id === null)
    .slice(0, 14)
    .map((c) => ({
      name: c.name,
      slug: c.slug,
      count: c.count,
      image: c.image,
      blurb: c.blurb,
    }));

  return (
    <HeaderClient
      shopName={settings.shopName}
      logoImage={settings.logoImage}
      tagline={settings.tagline}
      announcement={settings.announcementEnabled ? settings.announcement : ""}
      phone={settings.phone}
      whatsappHref={settings.whatsapp ? `https://wa.me/91${settings.whatsapp.replace(/\D/g, "").slice(-10)}` : null}
      categories={navCategories}
    />
  );
}
