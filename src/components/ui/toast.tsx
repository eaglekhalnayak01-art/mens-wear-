"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { IconAlert, IconCheckCircle, IconClose, IconInfo } from "@/components/ui/icons";

/**
 * App-wide toasts. Used for "added to cart", stock warnings and failed actions.
 * Announced politely through a live region so a screen reader hears the result
 * of a button press even though nothing navigated.
 */
type Tone = "good" | "bad" | "info" | "brass";
export type Toast = { id: number; title: string; description?: string; tone?: Tone; action?: { label: string; href: string } };

type ToastCtx = {
  push: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) return { push: () => {}, dismiss: () => {} };
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const counter = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      counter.current += 1;
      const id = counter.current;
      setItems((list) => [...list.slice(-2), { ...toast, id }]);
      timers.current.set(id, setTimeout(() => dismiss(id), toast.tone === "bad" ? 7000 : 4200));
    },
    [dismiss],
  );

  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end sm:px-0"
      >
        {items.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const tone = toast.tone ?? "info";
  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-md)] border px-3.5 py-3 shadow-lift backdrop-blur-[2px]",
        "animate-[rise_.35s_var(--ease-soft)_both]",
        tone === "good" && "border-good/25 bg-good-tint/95 text-good",
        tone === "bad" && "border-bad/25 bg-bad-tint/95 text-bad",
        tone === "brass" && "border-brass/25 bg-paper text-ink",
        tone === "info" && "border-line bg-paper text-ink",
      )}
    >
      <span className="mt-[1px] shrink-0">
        {tone === "good" ? <IconCheckCircle size={17} /> : tone === "bad" ? <IconAlert size={17} /> : <IconInfo size={17} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold leading-snug">{toast.title}</p>
        {toast.description ? <p className="mt-0.5 text-[12.5px] leading-snug opacity-85">{toast.description}</p> : null}
        {toast.action ? (
          <a href={toast.action.href} className="mt-1.5 inline-block text-[12.5px] font-semibold underline underline-offset-4">
            {toast.action.label}
          </a>
        ) : null}
      </div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification" className="-mr-1 -mt-1 rounded p-1 opacity-60 transition-opacity hover:opacity-100">
        <IconClose size={14} />
      </button>
    </div>
  );
}
