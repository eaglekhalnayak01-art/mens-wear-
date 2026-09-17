import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";
import { cn } from "@/lib/cn";

/**
 * The lockup: collar mark + the shop's name set in the brand face. Text rather than
 * an image by default, because a real shop's logo is usually its name — and it
 * recolours with the theme instead of shipping a second file. If the owner uploads
 * a logo in Settings, that image takes over.
 */
export function Wordmark({
  shopName,
  logoImage,
  tone = "ink",
  size = "md",
  href = "/",
  mark = true,
  className,
}: {
  shopName: string;
  logoImage?: string;
  tone?: "ink" | "bone";
  size?: "sm" | "md" | "lg";
  href?: string | null;
  /** Set false where the mark already sits next to this. */
  mark?: boolean;
  className?: string;
}) {
  const markSize = { sm: 24, md: 30, lg: 42 }[size];
  const [primary, ...rest] = shopName.split(" ");
  const sub = rest.join(" ");
  const sizes = {
    sm: { name: "text-[15px]", sub: "text-[8.5px] gap-[3px]" },
    md: { name: "text-[19px] sm:text-[21px]", sub: "text-[9px] gap-[5px]" },
    lg: { name: "text-[26px] sm:text-[31px]", sub: "text-[10px] gap-[7px]" },
  }[size];

  const content = logoImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoImage} alt={shopName} className={cn("h-8 w-auto object-contain", size === "lg" && "h-11")} />
  ) : (
    <span className="flex items-center gap-2.5">
      {mark ? <BrandMark size={markSize} tone={tone} /> : null}
      <span className="flex flex-col leading-none">
        <span className={cn("display font-semibold tracking-[-0.01em]", sizes.name, tone === "bone" ? "text-bone" : "text-ink")}>
          {primary}
        </span>
        {sub ? (
          <span
            className={cn(
              "font-semibold uppercase tracking-[0.3em]",
              sizes.sub,
              tone === "bone" ? "text-bone/70" : "text-brass-deep",
              "mt-[5px]",
            )}
          >
            {sub}
          </span>
        ) : null}
      </span>
    </span>
  );

  if (!href) return <span className={cn("inline-flex", className)}>{content}</span>;
  return (
    <Link href={href} aria-label={`${shopName} — home`} className={cn("inline-flex transition-opacity hover:opacity-80", className)}>
      {content}
    </Link>
  );
}
