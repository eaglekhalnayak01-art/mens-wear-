import { handle } from "@/server/http/handler";
import { getDashboardStats } from "@/server/queries";
import { enquiryStats } from "@/server/repositories/enquiries.repository";

/** Overview figures as JSON, so the dashboard can refresh without a full reload. */
export const GET = handle({ auth: "admin" }, async () => ({ ...getDashboardStats(), enquiries: enquiryStats() }));
