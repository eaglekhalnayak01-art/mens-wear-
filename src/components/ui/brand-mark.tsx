import { cn } from "@/lib/cn";

/**
 * The shop's mark: an “M” whose middle is a shirt collar — the two outer strokes are
 * the front edges of a shirt, the orange notch is the collar opening, the dot below is
 * the placket button. Inline SVG rather than a logo file so it
 * stays crisp at every size, inherits the palette, and cannot 404.
 *
 * Geometry is mirrored in `public/favicon.svg` and `public/images/logo-mark.svg`;
 * change it here and change those two with it.
 */
export function BrandMark({
  size = 32,
  tone = "ink",
  className,
}: {
  size?: number;
  tone?: "ink" | "bone" | "plain";
  className?: string;
}) {
  const plate = tone === "bone" ? "var(--color-bone)" : tone === "plain" ? "transparent" : "var(--color-ink)";
  const line = tone === "bone" ? "var(--color-ink)" : "var(--color-bone)";
  const accent = "var(--color-brass)";

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <rect x="2" y="2" width="60" height="60" rx="16" fill={plate} />
      <path
        d="M12.5 48.5 L12.5 20.5 L32 40 L51.5 20.5 L51.5 48.5"
        fill="none"
        stroke={line}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M25 22.5 L32 30 L39 22.5"
        fill="none"
        stroke={accent}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="47.5" r="2.7" fill={accent} />
    </svg>
  );
}
