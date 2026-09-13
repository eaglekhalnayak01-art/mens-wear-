import { cn } from "@/lib/cn";
import { discountPercent, money } from "@/lib/format";

/** Price line: sale price first, MRP struck behind it, saving as a chip. */
export function Price({
  price,
  compareAtPrice,
  size = "md",
  showSave = false,
  className,
}: {
  price: number;
  compareAtPrice?: number | null;
  size?: "sm" | "md" | "lg";
  showSave?: boolean;
  className?: string;
}) {
  const off = discountPercent(price, compareAtPrice);
  const sizes = { sm: "text-[13.5px]", md: "text-[15px]", lg: "text-[19px]" } as const;
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span data-money className={cn("font-semibold tracking-[-0.01em] text-ink", sizes[size])}>
        {money(price)}
      </span>
      {off > 0 ? (
        <>
          <span data-money className={cn("text-muted/90 line-through decoration-muted/50", size === "lg" ? "text-[14px]" : "text-[12.5px]")}>
            {money(compareAtPrice ?? 0)}
          </span>
          <span className={cn("font-semibold text-brass-deep", size === "lg" ? "text-[12.5px]" : "text-[11.5px]")}>{off}% off</span>
        </>
      ) : null}
      {showSave && off > 0 ? (
        <span className="text-[12px] text-good">You save {money((compareAtPrice ?? 0) - price)}</span>
      ) : null}
    </div>
  );
}
