import type { Metadata } from "next";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { getSettings } from "@/server/queries";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Four short steps: your details, delivery address, review, payment. No account required.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  const settings = getSettings();
  return (
    <CheckoutFlow
      settings={{
        codEnabled: settings.codEnabled,
        onlineEnabled: settings.onlineEnabled,
        deliveryFee: settings.deliveryFee,
        freeDeliveryOver: settings.freeDeliveryOver,
        minOrderValue: settings.minOrderValue,
        codFee: settings.codFee,
        dispatchDays: settings.dispatchDays,
        deliveryDaysMin: settings.deliveryDaysMin,
        deliveryDaysMax: settings.deliveryDaysMax,
        whatsapp: settings.whatsapp,
        shopName: settings.shopName,
      }}
    />
  );
}
