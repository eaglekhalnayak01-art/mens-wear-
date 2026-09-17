import type { Metadata } from "next";
import { CartPage } from "@/components/cart/cart-page";
import { getSettings, getStrip } from "@/server/queries";

export const metadata: Metadata = {
  title: "Your bag",
  description: "Review the pieces in your bag before checkout. Sizes, colours and quantities are checked against live stock at the shop.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/cart" },
};

export default function CartPageRoute() {
  const settings = getSettings();
  // Suggestions keep an empty cart from being a dead end.
  const suggestions = getStrip("bestsellers", 4);

  return (
    <CartPage
      suggestions={suggestions}
      settings={{
        shopName: settings.shopName,
        deliveryFee: settings.deliveryFee,
        freeDeliveryOver: settings.freeDeliveryOver,
        minOrderValue: settings.minOrderValue,
        codFee: settings.codFee,
        codEnabled: settings.codEnabled,
        dispatchDays: settings.dispatchDays,
        deliveryDaysMin: settings.deliveryDaysMin,
        deliveryDaysMax: settings.deliveryDaysMax,
        returnWindowDays: settings.returnWindowDays,
      }}
    />
  );
}
