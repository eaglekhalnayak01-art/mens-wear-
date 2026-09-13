"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  IconBox,
  IconChart,
  IconClose,
  IconGrid,
  IconLogout,
  IconMenu,
  IconSettings,
  IconTag,
  IconUsers,
} from "@/components/ui/icons";
import { BrandMark } from "@/components/ui/brand-mark";
import { AdminAlerts } from "@/components/admin/admin-alerts";
import { cn } from "@/lib/cn";

export const ADMIN_LINKS = [
  { href: "/admin", label: "Overview", icon: IconChart, exact: true },
  { href: "/admin/products", label: "Products", icon: IconGrid },
  { href: "/admin/orders", label: "Orders", icon: IconBox },
  { href: "/admin/inventory", label: "Inventory", icon: IconTag },
  { href: "/admin/customers", label: "Customers", icon: IconUsers },
  { href: "/admin/settings", label: "Settings", icon: IconSettings },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Desktop rail + mobile drawer. The dashboard has to work on a phone in the back
 * of the shop, so the small screen gets a full-height sheet with the same links
 * and a bottom tab bar for the four screens used daily.
 */
export function AdminSidebar({
  shopName,
  logoImage,
  logoText = "M",
}: {
  shopName: string;
  logoImage?: string;
  logoText?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-[212px] shrink-0 flex-col border-r border-line bg-paper px-3 py-4 lg:flex">
        <div className="flex items-start justify-between gap-1">
          <Link href="/admin" className="flex min-w-0 items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 transition-colors hover:bg-sand">
            {logoImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoImage} alt="" className="h-8 w-8 shrink-0 rounded-[var(--radius-xs)] object-contain" />
            ) : (
              <BrandMark size={30} />
            )}
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-semibold text-ink">{shopName}</span>
              <span className="block text-[10.5px] uppercase tracking-[0.12em] text-muted">
                {logoText ? `${logoText} · Owner area` : "Owner area"}
              </span>
            </span>
          </Link>
          <AdminAlerts />
        </div>

        <nav aria-label="Dashboard" className="mt-5 flex flex-col gap-0.5">
          {ADMIN_LINKS.map((link) => (
            <NavRow key={link.href} href={link.href} label={link.label} Icon={link.icon} exact={"exact" in link ? Boolean(link.exact) : false} />
          ))}
        </nav>

        <div className="mt-auto space-y-1 border-t border-line pt-3">
          <a href="/" target="_blank" rel="noreferrer noopener" className="flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-[12.5px] text-muted transition-colors hover:bg-sand hover:text-ink">
            <IconGrid size={15} /> View the shop
          </a>
          <AdminSignOut />
        </div>
      </aside>

      {/* Mobile bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-paper/95 px-3 py-2.5 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open dashboard menu"
          className="grid h-9 w-9 place-items-center rounded-full text-ink transition-colors hover:bg-sand"
        >
          <IconMenu size={18} />
        </button>
        <p className="truncate text-[12.5px] font-semibold text-ink">{shopName} · Owner area</p>
        <div className="flex shrink-0 items-center gap-1">
          <AdminAlerts />
          <a href="/" className="text-[11.5px] uppercase tracking-[0.09em] text-muted transition-colors hover:text-ink">
            Shop
          </a>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Dashboard menu">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/45" />
          <div className="animate-slide-left absolute inset-y-0 left-0 flex w-[264px] flex-col bg-paper px-3 py-4">
            <div className="mb-4 flex items-center justify-between px-1">
              <p className="text-[12.5px] font-semibold text-ink">{shopName}</p>
              <div className="flex items-center gap-1">
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="grid h-8 w-8 place-items-center rounded-full text-ink hover:bg-sand">
                <IconClose size={16} />
              </button>
              </div>
            </div>
            <nav aria-label="Dashboard" className="flex flex-col gap-0.5">
              {ADMIN_LINKS.map((link) => (
                <NavRow
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  Icon={link.icon}
                  exact={"exact" in link ? Boolean(link.exact) : false}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </nav>
            <div className="mt-auto border-t border-line pt-3">
              <AdminSignOut />
            </div>
          </div>
        </div>
      ) : null}

      <nav aria-label="Dashboard sections" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-paper/97 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {ADMIN_LINKS.slice(0, 5).map((link) => (
          <AdminTab key={link.href} href={link.href} label={link.label} Icon={link.icon} />
        ))}
      </nav>
    </>
  );
}

function NavRow({
  href,
  label,
  Icon,
  exact,
  onNavigate,
}: {
  href: string;
  label: string;
  Icon: (props: { size?: number }) => React.ReactElement;
  exact?: boolean;
  onNavigate?: () => void;
}) {
  const active = isActive(usePathname(), href, exact);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] transition-colors",
        active ? "bg-ink font-medium text-bone" : "text-graphite hover:bg-sand hover:text-ink",
      )}
    >
      <Icon size={16} />
      {label}
    </Link>
  );
}

function AdminTab({ href, label, Icon }: { href: string; label: string; Icon: (props: { size?: number }) => React.ReactElement }) {
  const active = isActive(usePathname(), href, href === "/admin");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("flex flex-1 flex-col items-center gap-1 py-2 text-[10.5px] transition-colors", active ? "text-ink" : "text-muted")}
    >
      <Icon size={17} />
      {label}
    </Link>
  );
}

function AdminSignOut() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        // Hard navigate: the whole shell belongs to a session that is ending, so a
        // client-side refresh would show a half-logged-in dashboard.
        await fetch("/api/admin/auth/logout", { method: "POST", headers: { "content-type": "application/json" } }).catch(() => null);
        window.location.assign("/admin/login");
      }}
      className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] text-muted transition-colors hover:bg-sand hover:text-ink"
    >
      <IconLogout size={16} /> Sign out
    </button>
  );
}
