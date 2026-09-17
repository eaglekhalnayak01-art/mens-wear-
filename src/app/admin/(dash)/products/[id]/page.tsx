import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/page-bits";
import { ProductForm } from "@/components/admin/product-form";
import { productToForm } from "@/components/admin/product-form-mapper";
import { getAdminProduct } from "@/server/repositories/products.admin";
import { getCategories } from "@/server/queries";
import { formatDate, money } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const product = getAdminProduct(Number(id));
  return { title: product ? `${product.name} · Edit` : "Edit product", robots: { index: false } };
}

export default async function EditProductPage({ params }: { params: Params }) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric < 1) notFound();

  const product = getAdminProduct(numeric);
  if (!product) notFound();

  const categories = getCategories();
  const initial = productToForm(product);

  return (
    <div className="py-6 sm:py-8">
      <div className="admin-shell max-w-[900px]">
        <AdminPageHeader
          title={product.name}
          description={`${product.soldQty} sold · ${product.stock} on the shelf · last edited ${formatDate(product.updatedAt)}`}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
          <span className="admin-chip">SKU {product.sku ?? "—"}</span>
          <span className="admin-chip">{money(product.price)}</span>
          {product.compareAtPrice ? <span className="admin-chip">was {money(product.compareAtPrice)}</span> : null}
          <span className="admin-chip">{product.category?.name ?? "Uncategorised"}</span>
          <span className="admin-chip">{product.rating ? `${product.rating.toFixed(1)} ★ · ${product.ratingCount} reviews` : "No reviews yet"}</span>
          <span className={statusChip(product.status)}>{product.status}</span>
        </div>
        <div className="mt-5">
          <ProductForm initial={initial} categories={categories.map((category) => ({ id: category.id, name: category.name }))} />
        </div>
      </div>
    </div>
  );
}

function statusChip(status: string) {
  const base = "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-medium";
  if (status === "published") return `${base} border-good/25 bg-good-tint text-good`;
  if (status === "draft") return `${base} border-line bg-sand text-muted`;
  return `${base} border-warn/25 bg-warn-tint text-warn`;
}
