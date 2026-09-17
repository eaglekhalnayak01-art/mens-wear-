"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useSession } from "@/components/account/session-provider";
import { api, ApiError } from "@/lib/client-api";
import { cn } from "@/lib/cn";

export function ProfileForm({ name, mobile, email }: { name: string; mobile: string; email: string }) {
  const router = useRouter();
  const { refresh } = useSession();
  const [draft, setDraft] = useState({ name, email });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = draft.name !== name || draft.email !== email;

  const submit = async () => {
    const found: Record<string, string> = {};
    if (draft.name.trim().length < 2) found.name = "We need a name for the parcel.";
    if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(draft.email.trim())) found.email = "That email does not look right — leave it blank to clear it.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    setError(null);
    try {
      await api.put("/api/store/account/profile", { name: draft.name.trim(), email: draft.email.trim() || undefined });
      await refresh();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2600);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "We could not save that. Try once more.");
      if (caught instanceof ApiError && caught.fields) setErrors(caught.fields);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="card-surface p-5 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={errors.name} htmlFor="pf-name">
          <Input id="pf-name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} invalid={Boolean(errors.name)} autoComplete="name" />
        </Field>
        <Field label="Mobile number" htmlFor="pf-mobile" hint="The number your orders are keyed to — call us to change it.">
          <Input id="pf-mobile" value={mobile} readOnly disabled className="cursor-not-allowed bg-sand/60 text-muted" />
        </Field>
        <Field label="Email" optionalLabel error={errors.email} className="sm:col-span-2" htmlFor="pf-email" hint="Used for the invoice and the tracking link only.">
          <Input id="pf-email" type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} invalid={Boolean(errors.email)} autoComplete="email" />
        </Field>
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-[12.5px] text-bad">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" variant="solid" size="md" loading={busy} disabled={!dirty}>
          Save changes
        </Button>
        <span className={cn("text-[12.5px] text-good transition-opacity", saved ? "opacity-100" : "opacity-0")} aria-live="polite">
          Saved
        </span>
      </div>
    </form>
  );
}
