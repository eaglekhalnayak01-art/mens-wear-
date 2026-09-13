import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Text wordmark by default (a real shop's logo is usually its name set in the
 * brand face), and an image as soon as the owner uploads one in Settings.
 */
export function Wordmark({
  shopName,
  logoImage,
  tone = "ink",
  size = "md",
  href = "/",
  className,
}: {
  shopName: string;
  logoImage?: string;
  tone?: "ink" | "bone";
  size?: "sm" | "md" | "lg";
  href?: string | null;
  className?: string;
}) {
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
    <span className="flex flex-col leading-none">
      <span className={cn("display font-semibold tracking-[-0.015em]", sizes.name, tone === "bone" ? "text-bone" : "text-ink")}>{primary}</span>
      {sub ? (
        <span
          className={cn(
            "font-semibold uppercase tracking-[0.34em]",
            sizes.sub,
            tone === "bone" ? "text-bone/65" : "text-muted",
            "mt-[5px]",
          )}
        >
          {sub}
        </span>
      ) : null}
    </span>
  );

  if (!href) return <span className={cn("inline-flex", className)}>{content}</span>;
  return (
    <Link href={href} aria-label={`${shopName} — home`} className={cn("inline-flex transition-opacity hover:opacity-80", className)}>
      {content}
    </Link>
  );
}
