import type { Metadata } from "next";
import { AccountTabs } from "@/components/account/account-tabs";
import { AddressManager } from "@/components/account/address-manager";
import { customerProfile } from "@/server/repositories/customers.repository";
import { requireCustomerPage } from "@/server/security/guard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saved addresses",
  description: "Where your parcels go.",
  robots: { index: false, follow: false },
};

export default async function AccountAddressesPage() {
  const customer = await requireCustomerPage("/account/addresses");
  const profile = customerProfile(customer.id);

  return (
    <div className="shop-shell py-9 md:py-12">
      <div className="mx-auto max-w-[1000px]">
        <header className="mb-7">
          <p className="eyebrow mb-2">Account</p>
          <h1 className="font-display text-[clamp(1.7rem,1.35rem+1.3vw,2.3rem)] leading-[1.1] text-ink">Saved addresses</h1>
          <p className="mt-2 max-w-[60ch] text-[13.5px] leading-relaxed text-muted">
            We keep these so you do not have to type a PIN code twice. A default address is used at checkout — everything else stays in your account.
          </p>
        </header>

        <AccountTabs pathname="/account/addresses" counts={{ orders: profile?.orders, addresses: profile?.addresses.length }} />

        <div className="mt-7">
          <AddressManager
            initial={profile?.addresses ?? []}
            defaultName={profile?.name ?? ""}
            defaultMobile={customer.mobile}
          />
        </div>
      </div>
    </div>
  );
}
