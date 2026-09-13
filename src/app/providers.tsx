"use client";

import { CartProvider } from "@/components/cart/cart-provider";
import { ToastProvider } from "@/components/ui/toast";
import { SessionProvider } from "@/components/account/session-provider";

/**
 * Client islands that must wrap both the storefront and the dashboard:
 * the cart (localStorage), toasts and the signed-in customer identity.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <SessionProvider>
        <CartProvider>{children}</CartProvider>
      </SessionProvider>
    </ToastProvider>
  );
}
