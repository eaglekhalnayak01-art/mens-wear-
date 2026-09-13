import { IconCheck } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type CheckoutStepId = "details" | "address" | "review" | "payment";

export const CHECKOUT_STEPS: { id: CheckoutStepId; label: string; hint: string }[] = [
  { id: "details", label: "Your details", hint: "Name and mobile only" },
  { id: "address", label: "Delivery address", hint: "PIN code decides the courier" },
  { id: "review", label: "Review", hint: "Sizes, quantities, notes" },
  { id: "payment", label: "Payment", hint: "Cash on delivery or online" },
];

/**
 * Progress for a four-step checkout. Steps you have already passed stay clickable
 * — being unable to go back and fix a PIN code is the classic abandoned-cart story.
 */
export function Stepper({ current, onJump, reachable }: { current: number; onJump?: (index: number) => void; reachable: number }) {
  return (
    <ol className="flex items-stretch gap-1.5 sm:gap-2.5" aria-label="Checkout progress">
      {CHECKOUT_STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const clickable = Boolean(onJump) && index <= reachable;
        return (
          <li key={step.id} className="min-w-0 flex-1">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onJump?.(index)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex w-full flex-col gap-1.5 border-t pt-2.5 text-left transition-colors sm:gap-2 sm:pt-3",
                done || active ? "border-ink" : "border-line",
                clickable ? "cursor-pointer hover:border-brass" : "cursor-default",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "nums grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[10px] font-semibold transition-colors",
                    done ? "bg-good text-bone" : active ? "bg-ink text-bone" : "border border-line bg-paper text-muted",
                  )}
                >
                  {done ? <IconCheck size={11} /> : index + 1}
                </span>
                <span
                  className={cn(
                    "truncate text-[11.5px] font-semibold uppercase tracking-[0.07em] sm:text-[12px]",
                    active ? "text-ink" : done ? "text-ink-soft" : "text-muted",
                  )}
                >
                  {step.label}
                </span>
              </span>
              <span className="hidden text-[11.5px] leading-snug text-muted sm:block">{step.hint}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
