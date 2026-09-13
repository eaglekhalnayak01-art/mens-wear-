import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { WhatsappButton } from "@/components/layout/whatsapp-button";
import { getSettings } from "@/server/queries";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const settings = getSettings();
  const digits = settings.whatsapp.replace(/\D/g, "");
  const waHref =
    settings.whatsappEnabled && digits.length >= 10
      ? `https://wa.me/91${digits.slice(-10)}?text=${encodeURIComponent(settings.whatsappGreeting)}`
      : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <CartDrawer deliveryFee={settings.deliveryFee} freeDeliveryOver={settings.freeDeliveryOver} />
      <WhatsappButton href={waHref} label="Ask us about size or stock" />
    </div>
  );
}
