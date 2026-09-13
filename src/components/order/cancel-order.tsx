"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/sheet";
import { Field, Input, Textarea } from "@/components/ui/field";
import { api, ApiError } from "@/lib/client-api";
import { canCancel } from "@/lib/order-status";
import type { OrderStatus } from "@/lib/order-status";

/**
 * Cancelling is a conversation, not a button: we ask for the mobile the order was
 * placed with (so a leaked tracking link cannot cancel someone's order) and give a
 * reason, because the reason is what the shop acts on.
 */
export function CancelOrder({ ref: orderRef, status, mobile }: { ref: string; status: string; mobile: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const allowed = canCancel(status as OrderStatus);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/store/orders/cancel", { ref: orderRef, mobile: phone.trim(), reason: reason.trim() || undefined });
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "We could not cancel it here. Call the shop and we will do it for you.");
    } finally {
      setBusy(false);
    }
  };

  if (!allowed) {
    return (
      <p className="text-[12.5px] leading-relaxed text-muted">
        This order has already moved past the point where it can be cancelled online. Call the shop on WhatsApp and we will sort it out — usually a swap or a
        pickup on arrival.
      </p>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-[12.5px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-bad">
        Cancel this order
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Cancel this order" description={`Reference ${orderRef}`} size="sm">
        <div className="space-y-4">
          <p className="text-[13.5px] leading-relaxed text-graphite">
            Nothing has been charged yet, so cancelling is simply us stopping the parcel. If a size you wanted is still on the rail, it goes back to the shelf
            straight away.
          </p>

          <Field label="Mobile number on the order" required error={error ? undefined : undefined} hint="We only cancel for the number that placed it." htmlFor="cancel-mobile">
            <Input id="cancel-mobile" inputMode="numeric" prefix="+91" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder={mobile.replace(/\s/g, "") || "98250 41188"} />
          </Field>

          <Field label="Reason (optional)" htmlFor="cancel-reason">
            <Textarea id="cancel-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Found it elsewhere · ordered the wrong size · delivery too slow" />
          </Field>

          {error ? (
            <p role="alert" className="rounded-[var(--radius-sm)] border border-bad/25 bg-bad-tint px-3 py-2 text-[12.5px] text-bad">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2.5 pt-1">
            <Button variant="light" fullWidth onClick={() => setOpen(false)} disabled={busy}>
              Keep the order
            </Button>
            <Button variant="danger" fullWidth loading={busy} onClick={submit} disabled={phone.replace(/\D/g, "").length !== 10}>
              Cancel order
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
