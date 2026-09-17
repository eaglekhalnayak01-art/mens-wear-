"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { IconClose } from "@/components/ui/icons";

/**
 * Sheet (drawer) + Dialog. Both: escape to close, click-outside to close, focus
 * moves in and returns out, and body scroll is locked while open. No dialog
 * library — this is the whole requirement in ~120 lines.
 */

function useModalBehaviour(open: boolean, onClose: () => void, ref: React.RefObject<HTMLDivElement | null>) {
  const restore = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restore.current = document.activeElement as HTMLElement;
    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    const node = ref.current;
    const focusable = node?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])');
    focusable?.[0]?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !node || !focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      restore.current?.focus?.();
    };
  }, [open, onClose, ref]);
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  side = "right",
  children,
  footer,
  labelledBy,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  side?: "right" | "left" | "bottom";
  children: React.ReactNode;
  footer?: React.ReactNode;
  labelledBy?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => onClose(), [onClose]);
  useModalBehaviour(open, close, ref);
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className={cn("fixed inset-0 z-[80]", open ? "" : "pointer-events-none")} aria-hidden={!open}>
      <div
        onClick={close}
        className={cn(
          "absolute inset-0 bg-ink/45 transition-opacity duration-300 ease-[cubic-bezier(.22,.61,.36,1)]",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        aria-labelledby={labelledBy}
        className={cn(
          "absolute flex max-h-[100dvh] flex-col bg-bone shadow-drawer transition-transform duration-[320ms] ease-[cubic-bezier(.22,1,.36,1)]",
          side === "right" && "inset-y-0 right-0 w-full max-w-[430px]",
          side === "left" && "inset-y-0 left-0 w-full max-w-[360px]",
          side === "bottom" && "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[var(--radius-xl)]",
          open
            ? "translate-x-0 translate-y-0"
            : side === "right"
              ? "translate-x-full"
              : side === "left"
                ? "-translate-x-full"
                : "translate-y-full",
          className,
        )}
      >
        {title ? (
          <header className="flex items-center justify-between gap-4 border-b border-line bg-paper/70 px-5 py-4 backdrop-blur">
            <div className="min-w-0">
              {title}
              {description ? <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close panel"
              className="-mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-sand"
            >
              <IconClose size={17} />
            </button>
          </header>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer ? <footer className="border-t border-line bg-paper px-5 py-4">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => onClose(), [onClose]);
  useModalBehaviour(open, close, ref);
  if (typeof document === "undefined" || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[85] grid place-items-center overflow-y-auto bg-ink/50 p-4 backdrop-blur-[2px]">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 cursor-default" onClick={close} tabIndex={-1} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={cn(
          "relative w-full animate-[scale-in_.24s_var(--ease-soft)_both] rounded-[var(--radius-lg)] border border-line bg-paper shadow-lift",
          size === "sm" && "max-w-[420px]",
          size === "md" && "max-w-[560px]",
          size === "lg" && "max-w-[860px]",
        )}
      >
        <header className="flex items-start justify-between gap-6 border-b border-line-soft px-5 py-4">
          <div>
            <h2 id="dialog-title" className="display text-[19px] leading-tight text-ink">
              {title}
            </h2>
            {description ? <p className="mt-1 text-[13px] leading-snug text-muted">{description}</p> : null}
          </div>
          <button type="button" onClick={close} aria-label="Close" className="-mr-1 -mt-1 grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-sand hover:text-ink">
            <IconClose size={16} />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <footer className="flex items-center justify-end gap-2 border-t border-line-soft bg-bone/60 px-5 py-3.5">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

/** Destructive-action confirmation used across the dashboard. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  tone = "bad",
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  tone?: "bad" | "ink";
  busy?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className="h-10 rounded-[var(--radius-sm)] px-4 text-[13px] font-medium text-ink-soft transition-colors hover:bg-sand">
            Keep it
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "h-10 rounded-[var(--radius-sm)] px-4 text-[13px] font-semibold text-bone transition-[filter,opacity] hover:brightness-110 disabled:opacity-50",
              tone === "bad" ? "bg-bad" : "bg-ink",
            )}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-[13.5px] leading-relaxed text-ink-soft">{body}</div>
    </Dialog>
  );
}
