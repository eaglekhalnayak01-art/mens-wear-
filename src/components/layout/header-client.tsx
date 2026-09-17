"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useCart } from "@/components/cart/cart-provider";
import { useSession } from "@/components/account/session-provider";
import { Wordmark } from "@/components/layout/wordmark";
import { SearchOverlay } from "@/components/layout/search-overlay";
import { MobileNav } from "@/components/layout/mobile-nav";
import { IconBag, IconChevronDown, IconClose, IconMenu, IconPhone, IconSearch, IconUser, IconWhatsapp } from "@/components/ui/icons";

export type NavCategory = { name: string; slug: string; count: number; image: string | null; blurb: string | null };

const NAV = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "New Arrivals", href: "/collections/new-arrivals" },
  { label: "Offers", href: "/offers" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

function cartLabel(count: number) {
  if (!count) return "Cart, empty";
  return `Cart, ${count} item${count === 1 ? "" : "s"}`;
}

export function HeaderClient({
  shopName,
  logoImage,
  tagline,
  announcement,
  phone,
  whatsappHref,
  categories,
}: {
  shopName: string;
  logoImage: string;
  tagline: string;
  announcement: string;
  phone: string;
  whatsappHref: string | null;
  categories: NavCategory[];
}) {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { count, bump, setOpen: openCart } = useCart();
  const { customer } = useSession();
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Any navigation closes the transient layers.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setCategoriesOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setCategoriesOpen(false);
        setAccountOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const telHref = `tel:${phone.replace(/\s/g, "")}`;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-50">
      {announcement ? (
        <div className="relative flex h-9 items-center justify-center gap-2 bg-ink px-10 text-center text-[11.5px] font-medium tracking-[0.03em] text-bone/90">
          <span className="line-clamp-1 sm:tracking-[0.05em]">{announcement}</span>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute right-3 hidden items-center gap-1 text-[11.5px] text-bone/70 underline-offset-4 hover:text-bone hover:underline sm:inline-flex"
            >
              <IconWhatsapp size={13} /> Chat
            </a>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "border-b bg-bone/95 backdrop-blur-md transition-[box-shadow,border-color,background-color] duration-300",
          scrolled ? "border-line shadow-[0_1px_0_rgba(23,24,26,0.04),0_10px_30px_-28px_rgba(23,24,26,0.5)]" : "border-line-soft",
        )}
      >
        <div className="shop-shell flex h-[58px] items-center justify-between gap-4 md:h-[74px]">
          <div className="flex items-center gap-2.5">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="-ml-1.5 grid h-10 w-10 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06] lg:hidden"
            >
              <IconMenu size={19} />
            </button>
            <Wordmark shopName={shopName} logoImage={logoImage} size={scrolled ? "sm" : "md"} className="md:mr-2" />
          </div>

          <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
            {NAV.slice(0, 3).map((item) => (
              <Link key={item.href} href={item.href} data-active={isActive(item.href)} className="link-line text-[13.5px] font-medium text-ink-soft transition-colors hover:text-ink data-[active=true]:text-ink">
                {item.label}
              </Link>
            ))}

            <div
              className="relative"
              onMouseEnter={() => setCategoriesOpen(true)}
              onMouseLeave={() => setCategoriesOpen(false)}
              onFocus={() => setCategoriesOpen(true)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) setCategoriesOpen(false);
              }}
            >
              <button
                type="button"
                aria-expanded={categoriesOpen}
                aria-controls="categories-menu"
                onClick={() => setCategoriesOpen((v) => !v)}
                className={cn(
                  "link-line inline-flex items-center gap-1 text-[13.5px] font-medium text-ink-soft transition-colors hover:text-ink",
                  isActive("/collections") && "text-ink",
                )}
                data-active={pathname.startsWith("/collections") || pathname.startsWith("/shop")}
              >
                Categories
                <IconChevronDown size={13} className={cn("transition-transform duration-300", categoriesOpen && "rotate-180")} />
              </button>

              {categoriesOpen ? (
                <div
                  id="categories-menu"
                  className="absolute left-1/2 top-[calc(100%+10px)] w-[min(720px,88vw)] -translate-x-1/2 animate-[scale-in_.2s_var(--ease-soft)_both] rounded-[var(--radius-md)] border border-line bg-paper p-5 shadow-lift"
                >
                  <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 sm:grid-cols-3">
                    {categories.map((category) => (
                      <Link
                        key={category.slug}
                        href={`/collections/${category.slug}`}
                        className="group flex items-baseline justify-between gap-3 rounded-[var(--radius-sm)] border-b border-transparent px-2 py-[7px] text-[13.5px] text-ink-soft transition-colors hover:bg-sand/70 hover:text-ink"
                      >
                        <span>{category.name}</span>
                        {category.count > 0 ? <span className="nums text-[11px] text-muted">{category.count}</span> : null}
                      </Link>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3.5">
                    <p className="max-w-[62%] text-[12px] leading-snug text-muted">{tagline}</p>
                    <Link href="/shop" className="text-[12.5px] font-semibold uppercase tracking-[0.09em] text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
                      Shop all
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            {NAV.slice(3).map((item) => (
              <Link key={item.href} href={item.href} data-active={isActive(item.href)} className="link-line text-[13.5px] font-medium text-ink-soft transition-colors hover:text-ink data-[active=true]:text-ink">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search products"
              className="grid h-10 w-10 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06]"
            >
              <IconSearch size={18} />
            </button>

            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                aria-expanded={accountOpen}
                aria-label={customer ? "Your account" : "Sign in or register"}
                className="grid h-10 w-10 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06]"
              >
                <IconUser size={18} />
              </button>
              {accountOpen ? (
                <AccountMenu customer={customer} onClose={() => setAccountOpen(false)} />
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => openCart(true)}
              aria-label={cartLabel(count)}
              className="relative grid h-10 w-10 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06]"
            >
              <IconBag size={18} className={cn(bump && "animate-bump")} />
              {count > 0 ? (
                <span className="nums absolute right-[3px] top-[3px] grid h-[16px] min-w-[16px] place-items-center rounded-full bg-ink px-[3px] text-[9.5px] font-semibold leading-none text-bone">
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </button>

            <Link
              href="/account"
              aria-label="Your account"
              className="grid h-10 w-10 place-items-center rounded-full text-ink transition-colors hover:bg-ink/[0.06] sm:hidden"
            >
              <IconUser size={18} />
            </Link>
          </div>
        </div>

        {phone ? (
          <div className="hidden border-t border-line-soft bg-paper/60 lg:block">
            <div className="shop-shell flex h-8 items-center justify-between text-[11.5px] text-muted">
              <p className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-good" />
                Now taking winter orders · Dispatch in 2 working days
              </p>
              <p className="flex items-center gap-4">
                <a href={telHref} className="inline-flex items-center gap-1.5 transition-colors hover:text-ink">
                  <IconPhone size={12} /> {phone}
                </a>
                <span className="text-line">|</span>
                <Link href="/policies/shipping" className="transition-colors hover:text-ink">Shipping</Link>
                <Link href="/policies/returns" className="transition-colors hover:text-ink">Returns</Link>
                <Link href="/track" className="transition-colors hover:text-ink">Track order</Link>
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <SearchOverlay open={searchOpen} onClose={() => { setSearchOpen(false); menuButtonRef.current?.focus(); }} />
      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} categories={categories} shopName={shopName} phone={phone} />
    </header>
  );
}

function AccountMenu({ customer, onClose }: { customer: { name: string | null; mobile: string } | null; onClose: () => void }) {
  const { signOut } = useSession();
  return (
    <>
      <button type="button" aria-label="Close account menu" className="fixed inset-0 z-10 cursor-default" onClick={onClose} tabIndex={-1} />
      <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-[248px] animate-[scale-in_.18s_var(--ease-soft)_both] rounded-[var(--radius-md)] border border-line bg-paper p-2 shadow-lift">
        {customer ? (
          <>
            <div className="px-2.5 py-2">
              <p className="text-[13px] font-semibold text-ink">{customer.name ?? "Your account"}</p>
              <p className="nums mt-0.5 text-[12px] text-muted">{customer.mobile}</p>
            </div>
            <div className="my-1 h-px bg-line-soft" />
            <MenuLink href="/account" onClick={onClose}>Your profile</MenuLink>
            <MenuLink href="/account/orders" onClick={onClose}>Orders</MenuLink>
            <MenuLink href="/account/addresses" onClick={onClose}>Saved addresses</MenuLink>
            <div className="my-1 h-px bg-line-soft" />
            <button
              type="button"
              onClick={async () => {
                await signOut();
                onClose();
              }}
              className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-[13px] text-ink-soft transition-colors hover:bg-sand"
            >
              Sign out
              <IconClose size={13} className="text-muted" />
            </button>
          </>
        ) : (
          <div className="p-2.5">
            <p className="text-[13px] font-semibold text-ink">Sign in for order tracking</p>
            <p className="mt-1 text-[12px] leading-snug text-muted">
              Optional — you can order as a guest. Use the mobile number you ordered with.
            </p>
            <div className="mt-3 grid gap-1.5">
              <Link href="/account/login" onClick={onClose} className="rounded-[var(--radius-sm)] bg-ink px-3 py-2 text-center text-[12.5px] font-semibold uppercase tracking-[0.07em] text-bone">
                Sign in with OTP
              </Link>
              <Link href="/track" onClick={onClose} className="rounded-[var(--radius-sm)] border border-line px-3 py-2 text-center text-[12.5px] font-medium text-ink transition-colors hover:bg-sand">
                Track an order
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function MenuLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="block rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] text-ink-soft transition-colors hover:bg-sand hover:text-ink">
      {children}
    </Link>
  );
}
