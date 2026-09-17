"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconInfo, IconTruck } from "@/components/ui/icons";
import { api, ApiError } from "@/lib/client-api";

/**
 * Track-by-number, without ever putting a phone number in a URL.
 *
 * A GET form would have written the reference and the mobile into the address bar, the
 * browser history, and every proxy log in between. So this posts to the verifier, which
 * is rate limited and answers with a signed link, and the browser is sent there.
 */
export function TrackOrderForm({ initialRef = "" }: { initialRef?: string }) {
  const router = useRouter();
  const [ref, setRef] = useState(initialRef);
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<{ ok: true; path: string }>("/api/store/orders/verify", {
        ref: ref.trim().toUpperCase(),
        mobile,
      });
      router.push(result.path);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "We could not check that just now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card-surface p-5 sm:p-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">Look it up</h2>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-[12.5px] font-medium text-ink-soft">Order reference</span>
        <input
          value={ref}
          onChange={(event) => setRef(event.target.value.toUpperCase())}
          placeholder="AMW-2026-XXXXXXXX"
          autoComplete="off"
          spellCheck={false}
          className="nums h-11 w-full rounded-[var(--radius-sm)] border border-line bg-paper px-3 text-[14px] tracking-[0.04em] text-ink placeholder:tracking-normal placeholder:text-muted focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-brass/15"
        />
      </label>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-[12.5px] font-medium text-ink-soft">Mobile number on the order</span>
        <input
          value={mobile}
          onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
          inputMode="numeric"
          autoComplete="tel"
          placeholder="98250 41188"
          className="nums h-11 w-full rounded-[var(--radius-sm)] border border-line bg-paper px-3 text-[14px] text-ink placeholder:text-muted focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-brass/15"
        />
      </label>

      {error ? (
        <p role="alert" className="mt-3.5 rounded-[var(--radius-sm)] border border-bad/25 bg-bad-tint px-3 py-2 text-[12.5px] leading-relaxed text-bad">
          {error}
        </p>
      ) : null}

      <Button type="submit" fullWidth className="mt-4" loading={busy} disabled={mobile.length !== 10 || ref.trim().length < 6}>
        <IconTruck size={15} /> Track it
      </Button>

      <p className="mt-3.5 flex items-start gap-1.5 text-[12px] leading-relaxed text-muted">
        <IconInfo size={14} className="mt-0.5 shrink-0 text-brass" />
        Both halves are needed — that is the whole proof, and also why nobody else can read your address by guessing a
        number. Nothing you type here is kept in the page address.
      </p>
    </form>
  );
}
