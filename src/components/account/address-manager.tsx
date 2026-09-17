"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/sheet";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { IconEdit, IconPin, IconTrash } from "@/components/ui/icons";
import { api, ApiError } from "@/lib/client-api";
import { LABELS, IN_STATES } from "@/lib/india";
import { isValidMobile, normalizeMobile } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { AddressRow } from "@/server/repositories/customers.repository";

type Draft = {
  id?: number;
  label: string;
  recipient: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pin: string;
  landmark: string;
  isDefault: boolean;
};

const BLANK: Draft = {
  label: "Home",
  recipient: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "Gujarat",
  pin: "",
  landmark: "",
  isDefault: false,
};

export function AddressManager({ initial, defaultName, defaultMobile }: { initial: AddressRow[]; defaultName: string; defaultMobile: string }) {
  const [addresses, setAddresses] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof Draft, value: unknown) => {
    setDraft((current) => ({ ...(current as Draft), [key]: value }));
    setErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  };

  const save = async () => {
    if (!draft) return;
    const found: Record<string, string> = {};
    if (draft.recipient.trim().length < 2) found.recipient = "Who receives the parcel?";
    if (!isValidMobile(draft.phone)) found.phone = "A reachable number for the courier.";
    if (draft.line1.trim().length < 6) found.line1 = "House or flat number and street.";
    if (draft.city.trim().length < 2) found.city = "City is required.";
    if (!/^\d{6}$/.test(draft.pin.trim())) found.pin = "PIN code must be 6 digits.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    setError(null);
    try {
      const data = await api.post<{ addresses: AddressRow[] }>("/api/store/account/addresses", {
        id: draft.id,
        label: draft.label,
        recipient: draft.recipient.trim(),
        phone: normalizeMobile(draft.phone),
        line1: draft.line1.trim(),
        line2: draft.line2.trim() || undefined,
        city: draft.city.trim(),
        state: draft.state,
        pin: draft.pin.trim(),
        landmark: draft.landmark.trim() || undefined,
        isDefault: draft.isDefault,
      });
      setAddresses(data.addresses ?? []);
      setDraft(null);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "We could not save that address. Try once more.");
      if (caught instanceof ApiError && caught.fields) setErrors(caught.fields);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    setBusy(true);
    setError(null);
    try {
      const data = await api.del<{ ok: boolean }>("/api/store/account/addresses", { id });
      setAddresses((current) => current.filter((address) => address.id !== id));
      void data;
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "We could not remove that address.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Saved addresses">
      {addresses.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id} className="card-surface flex flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                  <IconPin size={14} className="text-brass" />
                  {address.label ?? "Address"}
                  {address.isDefault ? (
                    <span className="rounded-full bg-sand px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[0.06em] text-graphite">Default</span>
                  ) : null}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        id: address.id,
                        label: address.label ?? "Home",
                        recipient: address.recipient ?? "",
                        phone: address.phone ?? "",
                        line1: address.line1,
                        line2: address.line2 ?? "",
                        city: address.city,
                        state: address.state,
                        pin: address.pin,
                        landmark: address.landmark ?? "",
                        isDefault: Boolean(address.isDefault),
                      })
                    }
                    aria-label={`Edit ${address.label ?? "address"}`}
                    className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-sand hover:text-ink"
                  >
                    <IconEdit size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(address.id)}
                    disabled={busy}
                    aria-label={`Delete ${address.label ?? "address"}`}
                    className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-bad-tint hover:text-bad"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>
              <address className="mt-2.5 text-[13px] not-italic leading-relaxed text-graphite">
                {address.recipient}
                <br />
                {address.line1}
                {address.line2 ? (
                  <>
                    , {address.line2}
                    <br />
                  </>
                ) : (
                  <br />
                )}
                {address.city}, {address.state} {address.pin}
                {address.landmark ? (
                  <>
                    <br />
                    Near {address.landmark}
                  </>
                ) : null}
              </address>
              {address.phone ? <p className="nums mt-2 text-[12px] text-muted">{address.phone}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<IconPin size={20} />}
          title="No saved addresses"
          description="Save the place parcels go and checkout becomes two taps. Nothing here is shared with anyone but the courier."
        />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="solid" size="md" onClick={() => { setDraft({ ...BLANK, recipient: defaultName, phone: defaultMobile }); setErrors({}); setError(null); }}>
          Add an address
        </Button>
        {error ? <p role="alert" className="text-[12.5px] text-bad">{error}</p> : null}
      </div>

      <Dialog
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit address" : "New address"}
        description="Only used for deliveries and invoices."
        size="md"
        footer={
          <div className="flex gap-2.5">
            <Button variant="light" fullWidth onClick={() => setDraft(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="solid" fullWidth loading={busy} onClick={save}>
              {draft?.id ? "Save changes" : "Save address"}
            </Button>
          </div>
        }
      >
        {draft ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Label" htmlFor="ad-label">
              <Select id="ad-label" value={draft.label} onChange={(event) => set("label", event.target.value)}>
                {LABELS.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Recipient" required error={errors.recipient} htmlFor="ad-recipient">
              <Input id="ad-recipient" value={draft.recipient} onChange={(event) => set("recipient", event.target.value)} invalid={Boolean(errors.recipient)} />
            </Field>
            <Field label="Phone" required error={errors.phone} htmlFor="ad-phone">
              <Input id="ad-phone" inputMode="numeric" prefix="+91" value={draft.phone} onChange={(event) => set("phone", event.target.value.replace(/\D/g, "").slice(0, 10))} invalid={Boolean(errors.phone)} />
            </Field>
            <Field label="PIN code" required error={errors.pin} htmlFor="ad-pin">
              <Input id="ad-pin" inputMode="numeric" value={draft.pin} onChange={(event) => set("pin", event.target.value.replace(/\D/g, "").slice(0, 6))} invalid={Boolean(errors.pin)} />
            </Field>
            <Field label="Flat / house no. and street" required error={errors.line1} className="sm:col-span-2" htmlFor="ad-line1">
              <Input id="ad-line1" value={draft.line1} onChange={(event) => set("line1", event.target.value)} invalid={Boolean(errors.line1)} />
            </Field>
            <Field label="Area / landmark (2nd line)" className="sm:col-span-2" htmlFor="ad-line2">
              <Textarea id="ad-line2" rows={2} value={draft.line2} onChange={(event) => set("line2", event.target.value)} placeholder="Near the medicine shop, gate 2" />
            </Field>
            <Field label="City" required error={errors.city} htmlFor="ad-city">
              <Input id="ad-city" value={draft.city} onChange={(event) => set("city", event.target.value)} invalid={Boolean(errors.city)} />
            </Field>
            <Field label="State" htmlFor="ad-state">
              <Select id="ad-state" value={draft.state} onChange={(event) => set("state", event.target.value)}>
                {IN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </Select>
            </Field>
            <div className={cn("sm:col-span-2")}>
              <Checkbox label="Use this as my default address" checked={draft.isDefault} onChange={(event) => set("isDefault", event.target.checked)} />
            </div>
          </div>
        ) : null}
      </Dialog>
    </section>
  );
}
