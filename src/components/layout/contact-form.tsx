"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { IconAlert, IconCheck, IconWhatsapp } from "@/components/ui/icons";
import { api, ApiError } from "@/lib/client-api";
import { isValidMobile, normalizeMobile } from "@/lib/format";

const TOPICS = [
  { value: "product", label: "A product or size" },
  { value: "order", label: "An order I placed" },
  { value: "size", label: "Fit & alterations" },
  { value: "bulk", label: "Bulk / corporate / shop stock" },
  { value: "other", label: "Something else" },
];

/**
 * The contact form is a courtesy, not a ticketing system: it writes to the shop's
 * inbox and hands the shopper a WhatsApp link, because that is where the answer
 * actually comes from. Errors name the field, never the stack.
 */
export function ContactForm({ whatsapp, whatsappEnabled, defaultOrderRef }: { whatsapp: string; whatsappEnabled: boolean; defaultOrderRef?: string }) {
  const [form, setForm] = useState({ name: "", mobile: "", email: "", topic: "product", message: "", orderRef: defaultOrderRef ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (form.name.trim().length < 2) found.name = "Tell us who is writing.";
    if (!isValidMobile(form.mobile)) found.mobile = "A 10-digit number we can call or WhatsApp back on.";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) found.email = "That email looks incomplete.";
    if (form.message.trim().length < 10) found.message = "A line or two more, so we can answer properly.";
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    setFailure(null);
    try {
      await api.post("/api/store/contact", {
        name: form.name.trim(),
        mobile: normalizeMobile(form.mobile),
        email: form.email.trim() || undefined,
        topic: form.topic,
        message: form.message.trim(),
        orderRef: form.orderRef.trim() || undefined,
      });
      setSent(true);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors(caught.fields ?? {});
        setFailure(caught.message);
      } else {
        setFailure("We could not send that. Check your connection, or WhatsApp us — we answer fastest there.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="card-surface animate-rise p-6 sm:p-8">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-good-tint text-good">
          <IconCheck size={18} />
        </span>
        <h2 className="mt-4 font-display text-[24px] leading-tight text-ink">Message with us</h2>
        <p className="mt-2 max-w-[46ch] text-[14px] leading-relaxed text-graphite">
          We read these between customers, usually the same day. If it is about an order on the way, we will call the number you gave rather than email.
        </p>
        {whatsappEnabled ? (
          <a
            href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, I just sent a message about ${form.orderRef ? `order ${form.orderRef}` : "your shop"}.`)}`}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-line px-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:border-ink"
          >
            <IconWhatsapp size={15} /> Send it on WhatsApp too
          </a>
        ) : null}
        <div className="mt-6 border-t border-line pt-4">
          <button type="button" onClick={() => setSent(false)} className="text-[12.5px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink">
            Write another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card-surface p-5 sm:p-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required error={errors.name} htmlFor="ct-name">
          <Input id="ct-name" value={form.name} onChange={(event) => set("name", event.target.value)} invalid={Boolean(errors.name)} autoComplete="name" />
        </Field>
        <Field label="Mobile" required error={errors.mobile} htmlFor="ct-mobile">
          <Input
            id="ct-mobile"
            inputMode="numeric"
            prefix="+91"
            value={form.mobile}
            onChange={(event) => set("mobile", event.target.value.replace(/\D/g, "").slice(0, 10))}
            invalid={Boolean(errors.mobile)}
            autoComplete="tel"
          />
        </Field>
        <Field label="Email" optionalLabel error={errors.email} htmlFor="ct-email">
          <Input id="ct-email" type="email" value={form.email} onChange={(event) => set("email", event.target.value)} invalid={Boolean(errors.email)} autoComplete="email" />
        </Field>
        <Field label="What is it about?" htmlFor="ct-topic">
          <Select id="ct-topic" value={form.topic} onChange={(event) => set("topic", event.target.value)}>
            {TOPICS.map((topic) => (
              <option key={topic.value} value={topic.value}>
                {topic.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Order reference" optionalLabel className="sm:col-span-2" htmlFor="ct-ref" hint="Only if it is about an order — helps us find it without asking.">
          <Input id="ct-ref" value={form.orderRef} onChange={(event) => set("orderRef", event.target.value.toUpperCase())} placeholder="AMW-2026-4F7K2" spellCheck={false} />
        </Field>
        <Field label="Message" required error={errors.message} className="sm:col-span-2" htmlFor="ct-message">
          <Textarea id="ct-message" rows={5} value={form.message} onChange={(event) => set("message", event.target.value)} invalid={Boolean(errors.message)} placeholder="Do you have the linen shirt in 42 with a shorter sleeve? I need it before 12 October." />
        </Field>
      </div>

      {failure ? (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-bad/25 bg-bad-tint px-3.5 py-2.5 text-[12.5px] leading-relaxed text-bad">
          <IconAlert size={15} className="mt-0.5 shrink-0" />
          {failure}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Button type="submit" variant="solid" size="lg" loading={busy}>
          Send to the shop
        </Button>
        <p className="text-[12px] leading-relaxed text-muted">
          We reply within a working day.
          <br className="sm:hidden" /> For anything urgent, WhatsApp is faster.
        </p>
      </div>
    </form>
  );
}
