import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/**
 * One button, five voices. `solid` is the shop's ink black; `brass` is only used
 * for the single most important action on a screen; `quiet` handles everything
 * else so the page never shouts.
 */
export type ButtonVariant = "solid" | "light" | "outline" | "quiet" | "brass" | "danger" | "link" | "white";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2 font-medium select-none " +
  "transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(.22,.61,.36,1)] " +
  "disabled:pointer-events-none disabled:opacity-45 active:translate-y-[0.5px] whitespace-nowrap";

const variants: Record<ButtonVariant, string> = {
  solid: "bg-ink text-bone hover:bg-ink-soft shadow-hair",
  light: "bg-paper text-ink border border-line hover:border-ink/35 hover:bg-sand/60",
  outline: "border border-ink/25 text-ink hover:border-ink hover:bg-ink/[0.03]",
  quiet: "text-ink-soft hover:bg-ink/[0.05] hover:text-ink",
  brass: "bg-brass text-white hover:bg-brass-deep shadow-hair",
  danger: "bg-bad text-white hover:brightness-95",
  white: "bg-paper text-ink hover:bg-white/90 shadow-card",
  link: "text-ink underline decoration-line underline-offset-4 hover:decoration-ink px-0 py-0 h-auto",
};

const sizes: Record<ButtonSize, string> = {
  xs: "h-8 px-3 text-[12.5px] rounded-[var(--radius-sm)]",
  sm: "h-9 px-3.5 text-[13px] rounded-[var(--radius-sm)]",
  md: "h-11 px-5 text-sm rounded-[var(--radius-sm)]",
  lg: "h-12 px-7 text-[15px] rounded-[var(--radius-sm)] tracking-[0.01em]",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "solid", size = "md", fullWidth, loading, iconLeft, iconRight, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], size === "md" || size === "lg" ? "uppercase tracking-[0.07em]" : "", sizes[size], fullWidth && "w-full", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : iconLeft}
      <span className={cn(loading && "opacity-80")}>{children}</span>
      {!loading && iconRight}
    </button>
  );
});

export function LinkButton({
  href,
  className,
  variant = "solid",
  size = "md",
  fullWidth,
  children,
  iconRight,
  iconLeft,
  ...rest
}: Omit<React.ComponentProps<typeof Link>, "className"> & {
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], size === "md" || size === "lg" ? "uppercase tracking-[0.07em]" : "", sizes[size], fullWidth && "w-full", className)}
      {...rest}
    >
      {iconLeft}
      <span>{children}</span>
      {iconRight}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-4 w-4 animate-spin", className)} aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.2" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Square icon-only control (cart, search, close, stepper arrows). */
export const IconButton = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: "ink" | "light" | "danger" }>(
  function IconButton({ className, label, tone = "ink", children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          "inline-grid h-9 w-9 place-items-center rounded-full border transition-colors duration-200",
          tone === "ink" && "border-line bg-paper text-ink hover:border-ink hover:bg-sand/70",
          tone === "light" && "border-transparent bg-paper/10 text-bone hover:bg-paper/20",
          tone === "danger" && "border-bad/30 bg-bad-tint text-bad hover:bg-bad/15",
          "disabled:pointer-events-none disabled:opacity-40",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
