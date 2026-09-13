import type { getAdminProduct } from "@/server/repositories/products.admin";
import type { ProductFormInitial } from "@/components/admin/product-form";

type AdminProduct = NonNullable<ReturnType<typeof getAdminProduct>>;

/**
 * Row shape → form shape, in one place, so creating and editing cannot drift apart.
 * The first gallery frame is the thumbnail: the repository already returns them in
 * `is_primary DESC, sort_order` order.
 */
export function productToForm(product: AdminProduct): ProductFormInitial {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brand: product.brand ?? "",
    categoryId: product.categoryId ?? null,
    subCategory: product.subCategory ?? "",
    description: product.description ?? "",
    fabric: product.fabric ?? "",
    care: product.care ?? "",
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? null,
    sku: product.sku ?? "",
    status: product.status === "hidden" ? "hidden" : product.status === "draft" ? "draft" : "published",
    paymentMode: product.paymentMode,
    deliveryDays: product.deliveryDays ? String(product.deliveryDays) : "",
    rating: product.rating ? String(product.rating) : "",
    ratingCount: product.ratingCount ? String(product.ratingCount) : "",
    isFeatured: product.isFeatured,
    isNewArrival: product.isNewArrival,
    isBestseller: product.isBestseller,
    lowStockThreshold: product.lowStockThreshold,
    sizes: product.sizes,
    colors: product.colors,
    stock: product.variants
      .filter((variant) => variant.size && variant.color)
      .map((variant) => ({ size: variant.size as string, color: variant.color as string, stock: variant.stock })),
    images: (product.gallery ?? []).map((image, index) => ({ src: image.src, alt: image.alt, isPrimary: index === 0 })),
  };
}

export function blankProduct(): ProductFormInitial {
  return {
    name: "",
    slug: "",
    brand: "",
    categoryId: null,
    subCategory: "",
    description: "",
    fabric: "",
    care: "",
    price: 0,
    compareAtPrice: null,
    sku: "",
    status: "draft",
    paymentMode: "both",
    deliveryDays: "",
    rating: "",
    ratingCount: "",
    isFeatured: false,
    isNewArrival: true,
    isBestseller: false,
    lowStockThreshold: 6,
    sizes: [],
    colors: [],
    stock: [],
    images: [],
  };
}
