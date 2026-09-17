import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-bits";
import { ProductsTable } from "@/components/admin/products-table";
import { FilterChips } from "@/components/admin/filter-chips";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { LinkButton } from "@/components/ui/button";
import { IconPlus, IconSearch } from "@/components/ui/icons";
import { listAdminProducts } from "@/server/repositories/products.admin";
import { getCategories } from "@/server/queries";
import { adminProductListQuery } from "@/server/validation/schemas";
import { adminParams } from "@/lib/admin-query";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Products", robots: { index: false } };

type Search = Promise<Record<string, string | string[] | undefined>>;

const PER_PAGE = 24;

export default async function AdminProductsPage({ searchParams }: { searchParams: Search }) {
  const parsed = adminProductListQuery.parse(adminParams(await searchParams));
  const query = { ...parsed, perPage: PER_PAGE };
  const { items, total, page, pages } = listAdminProducts(query);
  const categories = getCategories();

  return (
    <div className="py-6 sm:py-8">
      <div className="admin-shell">
        <AdminPageHeader
          title="Products"
          description={`${total} ${total === 1 ? "style" : "styles"} in the catalogue. Price, stock, pictures and the badges that drive the home page all live on this form.`}
          actions={
            <LinkButton href="/admin/products/new" variant="solid" size="sm" iconLeft={<IconPlus size={14} />}>
              New product
            </LinkButton>
          }
        />

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          {/* Plain GET form: filtering works before any JS has loaded. */}
          <form method="get" action="/admin/products" className="flex w-full flex-wrap items-center gap-2 lg:max-w-[520px]">
            <label className="relative flex-1 min-w-[180px]">
              <span className="sr-only">Search products</span>
              <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="search"
                name="q"
                defaultValue={parsed.q ?? ""}
                placeholder="Name, SKU or brand"
                className="admin-input pl-9"
                autoComplete="off"
              />
            </label>
            <select name="status" defaultValue={parsed.status} className="admin-input w-auto min-w-[124px]" aria-label="Visibility">
              <option value="all">All visibility</option>
              <option value="published">Published</option>
              <option value="hidden">Hidden</option>
              <option value="draft">Draft</option>
            </select>
            <select name="categoryId" defaultValue={parsed.categoryId ? String(parsed.categoryId) : ""} className="admin-input w-auto min-w-[140px]" aria-label="Category">
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select name="sort" defaultValue={parsed.sort} className="admin-input w-auto min-w-[132px]" aria-label="Sort by">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name_az">Name A–Z</option>
              <option value="stock_low">Least stock</option>
              <option value="price_high">Price high–low</option>
              <option value="price_low">Price low–high</option>
            </select>
            <button type="submit" className="admin-chip h-10 px-4 text-[12.5px] font-medium">
              Apply
            </button>
          </form>

          <FilterChips
            basePath="/admin/products"
            groups={[
              {
                key: "flag",
                label: "Badges",
                options: [
                  { value: "all", label: "Any" },
                  { value: "new", label: "New" },
                  { value: "bestseller", label: "Bestseller" },
                  { value: "featured", label: "Featured" },
                  { value: "sale", label: "On sale" },
                ],
                current: parsed.flag,
              },
              {
                key: "stock",
                label: "Stock",
                options: [
                  { value: "all", label: "Any" },
                  { value: "in", label: "In stock" },
                  { value: "low", label: "Low" },
                  { value: "out", label: "Sold out" },
                ],
                current: parsed.stock,
              },
            ]}
          />
        </div>

        <div className="mt-4 overflow-hidden rounded-[var(--radius-md)] border border-line bg-paper">
          <ProductsTable items={items} />
        </div>

        <AdminPagination page={page} pages={pages} total={total} basePath="/admin/products" label="products" searchParams={searchParams} />
      </div>
    </div>
  );
}
