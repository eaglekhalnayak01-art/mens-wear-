import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/page-bits";
import { EnquiryInbox } from "@/components/admin/enquiry-inbox";
import { listEnquiries, enquiryStats } from "@/server/repositories/enquiries.repository";
import { getSettings } from "@/server/queries";
import { adminParams, withParam } from "@/lib/admin-query";
import { z } from "zod";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

type Search = Promise<Record<string, string | string[] | undefined>>;

const querySchema = z.object({ status: z.enum(["all", "new", "replied", "closed"]).default("new") });

const TABS = [
  { value: "new", label: "Waiting" },
  { value: "replied", label: "Replied" },
  { value: "closed", label: "Archived" },
  { value: "all", label: "Everything" },
];

export default async function AdminEnquiriesPage({ searchParams }: { searchParams: Search }) {
  const raw = await searchParams;
  const parsed = querySchema.parse(adminParams(raw));
  const enquiries = listEnquiries({ status: parsed.status, limit: 100 });
  const stats = enquiryStats();
  const settings = getSettings();
  const filterParams = adminParams(raw);

  return (
    <div className="py-6 sm:py-8">
      <div className="admin-shell max-w-[880px]">
        <AdminPageHeader
          title="Messages"
          description="What people send from the contact page — sizing questions, bulk enquiries, wedding orders. Nothing is emailed anywhere yet, so this is the only place to look."
        />

        <div className="mt-5 flex flex-wrap items-center gap-1.5">
          {TABS.map((tab) => (
            <Link key={tab.value} href={withParam(filterParams, "status", tab.value)} className={`admin-chip ${parsed.status === tab.value ? "border-ink bg-ink text-bone" : ""}`}>
              {tab.label}
              {tab.value === "new" && stats.open > 0 ? <span className="nums ml-1 text-brass">{stats.open}</span> : null}
            </Link>
          ))}
          <span className="ml-auto text-[11.5px] text-muted">
            <span className="nums font-semibold text-ink">{stats.total}</span> in total
          </span>
        </div>

        <div className="mt-4">
          <EnquiryInbox enquiries={enquiries} whatsappEnabled={settings.whatsappEnabled} />
        </div>
      </div>
    </div>
  );
}
