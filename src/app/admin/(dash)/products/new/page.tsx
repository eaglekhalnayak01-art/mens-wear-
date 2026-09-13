import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-bits";
import { ProductForm } from "@/components/admin/product-form";
import { blankProduct } from "@/components/admin/product-form-mapper";
import { getCategories } from "@/server/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "New product", robots: { index: false } };

export default async function NewProductPage() {
  const categories = getCategories();

  return (
    <div className="py-6 sm:py-8">
      <div className="admin-shell max-w-[900px]">
        <AdminPageHeader title="New product" description="Fill in what you know. Blank fields are worked out for you — the web address, the SKUs, the resizing of your photos." />
        <div className="mt-5">
          <ProductForm categories={categories.map((category) => ({ id: category.id, name: category.name }))} initial={blankProduct()} />
        </div>
      </div>
    </div>
  );
}
