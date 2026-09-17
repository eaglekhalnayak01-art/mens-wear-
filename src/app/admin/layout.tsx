import type { Metadata } from "next";
import "../admin.css";

export const metadata: Metadata = {
  title: { default: "Owner dashboard", template: "%s · Mens Wear admin" },
  robots: { index: false, follow: false },
};

/**
 * The admin shell is intentionally not part of the (store) group: no customer
 * navigation ever links here, the layout carries its own chrome, and every page
 * under it sits behind the session guard.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root min-h-dvh bg-bone text-ink">
      {children}
    </div>
  );
}
