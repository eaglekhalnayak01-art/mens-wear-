import { AdminSidebar } from "@/components/admin/admin-nav";
import { requireAdminPage } from "@/server/security/guard";
import { getSettings } from "@/server/queries";

export const dynamic = "force-dynamic";

/**
 * Everything a signed-in owner can see. The guard runs on the server for every
 * page in this group, and every API route repeats the check — a page-level
 * redirect is convenience, the per-request authorisation is the security.
 */
export default async function AdminDashLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  const settings = getSettings();

  return (
    <div className="flex min-h-dvh">
      <AdminSidebar shopName={settings.shopName} logoImage={settings.logoImage} logoText={settings.logoText} />
      <main id="main" className="min-w-0 flex-1 pb-[76px] lg:pb-10">
        {children}
      </main>
    </div>
  );
}
