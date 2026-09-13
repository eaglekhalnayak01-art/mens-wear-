import { STATUS_META, TIMELINE_STEPS, type OrderStatus } from "@/lib/order-status";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { IconCheck, IconTruck } from "@/components/ui/icons";

/**
 * Vertical fulfilment timeline. Events come from `order_events`, so the dates are
 * what actually happened rather than an estimate — a step that has not happened
 * yet is drawn as a hollow dot with its expected wording instead.
 */
export function OrderTimeline({ status, events }: { status: string; events?: { status: string; createdAt: string; note: string | null }[] }) {
  const cancelled = status === "cancelled";
  const currentIndex = TIMELINE_STEPS.indexOf(status as OrderStatus);

  const eventFor = (step: OrderStatus) => events?.find((event) => event.status === step);

  return (
    <ol className="relative space-y-0" aria-label="Order progress">
      {TIMELINE_STEPS.map((step, index) => {
        const meta = STATUS_META[step];
        const done = !cancelled && index < currentIndex;
        const current = !cancelled && index === currentIndex;
        const event = eventFor(step);
        const note = event?.note ?? (current ? meta.customerNote : done ? meta.customerNote : undefined);
        return (
          <li key={step} className="relative flex gap-4 pb-6 last:pb-0">
            {index < TIMELINE_STEPS.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn("absolute left-[13px] top-[26px] h-[calc(100%-26px)] w-px", done ? "bg-good" : "bg-line")}
                style={done ? { backgroundImage: "linear-gradient(to bottom, var(--color-good), var(--color-good))" } : undefined}
              />
            ) : null}

            <span
              className={cn(
                "relative z-10 mt-0.5 grid h-[27px] w-[27px] shrink-0 place-items-center rounded-full border transition-colors",
                done ? "border-good bg-good text-bone" : current ? "border-ink bg-ink text-bone" : "border-line bg-paper text-muted",
                step === "shipped" && current ? "animate-pulse-soft" : "",
              )}
            >
              {done ? <IconCheck size={13} /> : current ? <span className="h-2 w-2 rounded-full bg-bone" /> : <span className="h-1.5 w-1.5 rounded-full bg-line" />}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <p className={cn("text-[13.5px] font-semibold", done || current ? "text-ink" : "text-muted")}>{meta.label}</p>
                {event ? <p className="nums text-[11.5px] text-muted">{formatDateTime(event.createdAt)}</p> : null}
              </div>
              {note ? (
                <p className={cn("mt-1 max-w-[52ch] text-[12.5px] leading-relaxed", current ? "text-graphite" : "text-muted")}>{note}</p>
              ) : null}
              {step === "delivered" && !done && !current ? (
                <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
                  <IconTruck size={13} /> Signed for by you or someone at the address.
                </p>
              ) : null}
            </div>
          </li>
        );
      })}

      {cancelled ? (
        <li className="relative -mt-2 flex gap-4">
          <span aria-hidden="true" className="mt-0.5 grid h-[27px] w-[27px] shrink-0 place-items-center rounded-full border border-bad bg-bad-tint text-bad">
            ✕
          </span>
          <div>
            <p className="text-[13.5px] font-semibold text-bad">Order cancelled</p>
            <p className="mt-1 max-w-[48ch] text-[12.5px] leading-relaxed text-muted">
              {events?.find((event) => event.status === "cancelled")?.note ?? "Nothing was charged. Anything paid by UPI is refunded within 3 working days."}
            </p>
          </div>
        </li>
      ) : null}
    </ol>
  );
}

/** Thin progress bar version for list rows (account order cards, admin table). */
export function StatusProgress({ status, className }: { status: string; className?: string }) {
  const meta = STATUS_META[status as OrderStatus] ?? STATUS_META.placed;
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-line", className)} role="img" aria-label={`Progress: ${meta.short}`}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(.22,.61,.36,1)]", status === "cancelled" ? "bg-bad" : status === "delivered" ? "bg-good" : "bg-ink")}
        style={{ width: `${status === "cancelled" ? 100 : meta.step}%` }}
      />
    </div>
  );
}
