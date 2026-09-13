"use client";

import { useState } from "react";
import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { Wordmark } from "@/components/layout/wordmark";
import { useSession } from "@/components/account/session-provider";
import { IconArrowRight, IconChevronDown, IconPhone, IconUser, IconWhatsapp } from "@/components/ui/icons";
import type { NavCategory } from "@/components/layout/header-client";

const LINKS = [
  { label: "Home", href: "/" },
  { label: "Shop all", href: "/shop" },
  { label: "New Arrivals", href: "/collections/new-arrivals" },
  { label: "Best Sellers", href: "/collections/best-sellers" },
  { label: "Sale", href: "/collections/sale" },
  { label: "Offers", href: "/offers" },
  { label: "Track order", href: "/track" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function MobileNav({
  open,
  onClose,
  categories,
  shopName,
  phone,
}: {
  open: boolean;
  onClose: () => void;
  categories: NavCategory[];
  shopName: string;
  phone: string;
}) {
  const [showCategories, setShowCategories] = useState(false);
  const { customer } = useSession();

  return (
    <Sheet open={open} onClose={onClose} side="left" className="w-[min(360px,88vw)]" title={<Wordmark shopName={shopName} size="sm" href={null} />}>
      <nav aria-label="Mobile" className="px-3 py-2">
        {customer ? (
          <Link
            href="/account"
            onClick={onClose}
            className="mb-2 flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-paper px-3.5 py-3"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-[12px] font-semibold text-bone">
              {(customer.name ?? customer.mobile).slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-semibold text-ink">{customer.name ?? "Your account"}</span>
              <span className="nums block text-[12px] text-muted">{customer.mobile}</span>
            </span>
            <IconArrowRight size={15} className="ml-auto text-muted" />
          </Link>
        ) : (
          <Link
            href="/account/login"
            onClick={onClose}
            className="mb-2 flex items-center gap-2.5 rounded-[var(--radius-md)] border border-line bg-paper px-3.5 py-3 text-[13.5px] font-medium text-ink"
          >
            <IconUser size={17} className="text-muted" />
            Sign in / register
            <span className="ml-auto text-[11.5px] font-normal text-muted">Optional</span>
          </Link>
        )}

        <ul className="divide-y divide-line-soft">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} onClick={onClose} className="flex items-center justify-between py-3 text-[15px] font-medium text-ink">
                {link.label}
                <IconArrowRight size={15} className="text-muted" />
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setShowCategories((value) => !value)}
              aria-expanded={showCategories}
              className="flex w-full items-center justify-between py-3 text-left text-[15px] font-medium text-ink"
            >
              Categories
              <IconChevronDown size={16} className={`text-muted transition-transform duration-300 ${showCategories ? "rotate-180" : ""}`} />
            </button>
            {showCategories ? (
              <ul className="mb-2 grid grid-cols-2 gap-1.5">
                {categories.map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/collections/${category.slug}`}
                      onClick={onClose}
                      className="block rounded-[var(--radius-sm)] border border-line bg-paper px-2.5 py-2 text-[12.5px] text-ink-soft transition-colors active:bg-sand"
                    >
                      {category.name}
                      {category.count > 0 ? <span className="nums ml-1 text-[10.5px] text-muted">{category.count}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        </ul>

        <div className="mt-4 grid gap-2 pb-2">
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="flex h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-ink text-[12.5px] font-semibold uppercase tracking-[0.07em] text-bone"
          >
            <IconPhone size={15} /> Call the shop
          </a>
          <Link
            href="/contact"
            onClick={onClose}
            className="flex h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-line bg-paper text-[12.5px] font-semibold uppercase tracking-[0.07em] text-ink"
          >
            <IconWhatsapp size={15} /> WhatsApp us
          </Link>
        </div>
      </nav>
    </Sheet>
  );
}
