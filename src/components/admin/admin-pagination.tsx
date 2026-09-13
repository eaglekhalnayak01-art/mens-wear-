import { Pagination } from "@/components/ui/pagination";

export type AdminPageInfo = { page: number; pages: number };

/**
 * Same link-based pagination the storefront uses, wired to whatever filters are
 * currently in the URL so paging never throws away a search.
 */
export async function AdminPagination({
  basePath,
  label,
  total,
  page,
  pages,
  searchParams,
}: {
  basePath: string;
  label: string;
  total: number;
  page: number;
  pages: number;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const entries = Object.entries(raw).filter(([, value]) => value !== undefined && value !== "");
  const build = (target: number) => {
    const params = new URLSearchParams(entries as [string, string][]);
    if (target <= 1) params.delete("page");
    else params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const from = total === 0 ? 0 : (page - 1) * 24 + 1;
  const to = Math.min(total, page * 24);

  return (
    <Pagination
      page={page}
      pages={pages}
      buildHref={build}
      className="mt-5"
      summary={
        <span className="text-[12.5px] text-muted">
          {total === 0 ? `No ${label} to show` : `${from}–${to} of ${total} ${label}`}
        </span>
      }
    />
  );
}
