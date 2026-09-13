"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { IconAlert, IconArrowRight, IconCheck } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/client-api";
import { ORDER_STATUSES, STATUS_META, isTerminal, nextStatus, type OrderStatus } from "@/lib/order-status";
import { cn } from "@/lib/cn";

/**
 * Status control for one order. The owner picks where the order stands and writes
 * the line the customer will read; stock returns to the shelf automatically when
 * the status releases it.
 */
export function OrderStatusEditor({
  orderId,
  status,
  paymentStatus,
  canCancel,
}: {
  orderId: number;
  status: string;
  paymentStatus: string;
  canCancel: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [choice, setChoice] = useState<OrderStatus>(status as OrderStatus);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = choice !== status || note.trim().length > 0;

  const save = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setError(null);
    if (choice === "cancelled" && note.trim().length < 4) {
      setError("A cancelled order needs a reason — the customer sees it on their tracking page.");
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/api/admin/orders/${orderId}/status`, {
        status: choice,
        note: note.trim() || undefined,
        ...(choice === "cancelled" ? { reason: note.trim() } : {}),
      });
      toast.push({
        title: `Now: ${STATUS_META[choice].label}`,
        description: choice === status ? "Note added to the timeline." : "The customer’s tracking page will show it on their next look.",
        tone: "good",
      });
      setNote("");
      router.refresh();
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message : "We could not reach the shop. Nothing was changed.";
      setError(message);
      toast.push({ title: "Status not saved", description: message, tone: "bad" });
    } finally {
      setBusy(false);
    }
  };

  const step = nextStatus(status as OrderStatus);

  return (
    <form onSubmit={save} className="space-y-4" noValidate>
      <fieldset>
        <legend className="admin-section-title">Move this order to</legend>
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {ORDER_STATUSES.map((entry) => {
            const active = choice === entry;
            const blocked = entry === "cancelled" && !canCancel;
            return (
              <button
                key={entry}
                type="button"
                disabled={blocked}
                onClick={() => setChoice(entry)}
                aria-pressed={active}
                title={blocked ? "Cannot cancel once the parcel has left the shop" : STATUS_META[entry].customerNote}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border px-2.5 py-2 text-left text-[12px] transition-colors",
                  active ? "border-ink bg-ink text-bone" : "border-line bg-paper text-graphite hover:border-ink",
                  blocked && "cursor-not-allowed opacity-40 hover:border-line",
                )}
              >
                {STATUS_META[entry].short}
                {active ? <IconCheck size={12} /> : null}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Field label="Note for the customer" optionalLabel htmlFor="os-note" hint={choice === "cancelled" ? "Required when cancelling — the reason is shown to the customer." : "Left blank, we write the standard line for this status."}>
        <Textarea id="os-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Packed in two boxes, dispatched with Blue Dart." />
      </Field>

      {error ? (
        <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-bad/25 bg-bad-tint px-3 py-2 text-[12px] leading-relaxed text-bad">
          <IconAlert size={13} className="mt-0.5 shrink-0" /> {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant="solid" size="sm" loading={busy} disabled={!dirty}>
          {dirty ? "Save status" : "No changes"}
        </Button>
        {step && !isTerminal(status) ? (
          <button
            type="button"
            onClick={() => {
              setChoice(step);
              void (async () => {
                setBusy(true);
                try {
                  await api.patch(`/api/admin/orders/${orderId}/status`, { status: step, note: note.trim() || undefined });
                  toast.push({ title: `Now: ${STATUS_META[step].label}`, tone: "good" });
                  setNote("");
                  router.refresh();
                } catch (caught) {
                  toast.push({ title: "Status not saved", description: caught instanceof ApiError ? caught.message : "Network problem.", tone: "bad" });
                } finally {
                  setBusy(false);
                }
              })();
            }}
            className="admin-chip h-9 px-3 text-[12.5px] font-medium"
          >
            Skip straight to {STATUS_META[step].short} <IconArrowRight size={12} />
          </button>
        ) : null}
      </div>

      <p className="border-t border-line pt-3 text-[11.5px] leading-relaxed text-muted">
        Payment: <span className={cn("font-medium", paymentStatus === "paid" ? "text-good" : paymentStatus === "failed" ? "text-bad" : "text-ink")}>{paymentStatus}</span>
        {" · "}cancelling from here puts every piece back on the shelf.
      </p>
    </form>
  );
}
