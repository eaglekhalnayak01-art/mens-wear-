import { ProductCard } from "@/components/shop/product-card";
import { cn } from "@/lib/cn";
import type { ProductCard as ProductCardType } from "@/server/repositories/types";

/** Server-rendered grid: cards are the only client island in the listing. */
export function ProductGrid({
  products,
  columns = 4,
  className,
  priorityCount = 4,
  compact = false,
}: {
  products: ProductCardType[];
  columns?: 2 | 3 | 4 | 5;
  className?: string;
  priorityCount?: number;
  compact?: boolean;
}) {
  const cols = {
    2: "grid-cols-2 gap-x-4 gap-y-8",
    3: "grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-3",
    4: "grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-y-10 lg:grid-cols-4 lg:gap-x-5",
    5: "grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-4",
  }[columns];

  return (
    <ul className={cn("grid", cols, className)}>
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard product={product} priority={index < priorityCount} compact={compact} />
        </li>
      ))}
    </ul>
  );
}
