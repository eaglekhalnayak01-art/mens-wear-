"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { api, ApiError } from "@/lib/client-api";

/**
 * The front desk for a bare order number: type the reference plus the mobile it was
 * placed with, and the server answers with a signed link. Nothing about the order is
 * rendered in this component, so a wrong number teaches an attacker nothing and the
 * page cannot be used to walk through the register one reference at a time.
 */
export function OrderVerifyForm({ reference }: { reference: string }) {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<{ ok: true; path: string }>("/api/store/orders/verify", {
        ref: reference,
        mobile,
      });
      router.replace(result.path);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "We could not check that just now. Please try again.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card-surface mx-auto max-w-[440px] p-5 sm:p-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">Confirm it is you</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-graphite">
        A reference on its own is not enough to open an order — they get printed on slips and forwarded in
        messages. Enter <strong className="nums font-semibold text-ink">{reference}</strong> with the mobile number it was
        placed on, and we will show you the status.
      </p>

      <div className="mt-4">
        <Field label="Mobile number on the order" htmlFor="verify-mobile" required hint="Ten digits, the one you checked out with.">
          <Input
            id="verify-mobile"
            inputMode="numeric"
            prefix="+91"
            value={mobile}
            onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="98250 41188"
          />
        </Field>
      </div>

      {error ? (
        <p role="alert" className="mt-3 rounded-[var(--radius-sm)] border border-bad/25 bg-bad-tint px-3 py-2 text-[12.5px] text-bad">
          {error}
        </p>
      ) : null}

      <Button type="submit" fullWidth className="mt-4" loading={busy} disabled={mobile.length !== 10}>
        Show my order
      </Button>
    </form>
  );
}
