import Link from "next/link";
import { SignOutButton } from "@/components/account/sign-out-button";
import { money } from "@/lib/format";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/profile", label: "Details" },
];

export function AccountTabs({ pathname, counts }: { pathname: string; counts?: { orders?: number; addresses?: number } }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
      <nav aria-label="Account" className="-mx-1 flex flex-wrap gap-0.5">
        {TABS.map((tab) => {
          const active = tab.href === "/account" ? pathname === "/account" : pathname.startsWith(tab.href);
          const count = tab.href === "/account/orders" ? counts?.orders : tab.href === "/account/addresses" ? counts?.addresses : undefined;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative rounded-[var(--radius-xs)] px-3 py-1.5 text-[13px] transition-colors",
                active ? "bg-sand font-medium text-ink" : "text-muted hover:bg-sand/60 hover:text-ink",
              )}
            >
              {tab.label}
              {typeof count === "number" && count > 0 ? <span className="nums ml-1.5 text-[11.5px] opacity-70">{count}</span> : null}
            </Link>
          );
        })}
      </nav>
      <SignOutButton />
    </div>
  );
}

export function AccountStat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-paper px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="nums mt-1.5 font-display text-[22px] leading-none text-ink">{value}</p>
      {hint ? <p className="mt-1.5 text-[12px] leading-snug text-muted">{hint}</p> : null}
    </div>
  );
}

export function moneyLabel(value: number) {
  return money(value);
}
