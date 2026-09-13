"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { IconAlert, IconCheck } from "@/components/ui/icons";
import { SingleImageField } from "@/components/admin/single-image-field";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/client-api";
import { money } from "@/lib/format";
import { cn } from "@/lib/cn";

type FieldType = "text" | "money" | "number" | "textarea" | "toggle" | "image" | "tel" | "email" | "url";

type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
  placeholder?: string;
  wide?: boolean;
  rows?: number;
  required?: boolean;
  /** Kept in sync with the server schema so a bad value is caught before a request. */
  check?: "pin" | "mobile" | "gst" | "positive";
};

type Group = { id: string; title: string; description: string; fields: FieldDef[] };

const GROUPS: Group[] = [
  {
    id: "identity",
    title: "The shop’s name and face",
    description: "What the customer reads at the top of every page, and the story on the About page.",
    fields: [
      { key: "shopName", label: "Shop name", type: "text", required: true, hint: "Used in the header, footer, emails and policy text." },
      { key: "tagline", label: "Tagline", type: "text", placeholder: "Considered menswear, tailored for everyday" },
      { key: "logoText", label: "Logo letter", type: "text", hint: "Shown in the square when there is no logo image." },
      { key: "logoImage", label: "Logo image", type: "image", wide: true, hint: "Transparent PNG, roughly square. Leave empty to use the wordmark." },
      { key: "foundedYear", label: "Since", type: "text", placeholder: "2014" },
      { key: "aboutTitle", label: "About page headline", type: "text" },
      { key: "brandStory", label: "Brand story", type: "textarea", wide: true, rows: 5, hint: "Two or three honest paragraphs. Plain words beat adjectives." },
    ],
  },
  {
    id: "home",
    title: "Home page words",
    description: "The hero and the offer band. Change them for a sale, a festival, or a quiet week.",
    fields: [
      { key: "heroEyebrow", label: "Hero eyebrow", type: "text", placeholder: "New season" },
      { key: "heroTitle", label: "Hero headline", type: "text" },
      { key: "heroSubtitle", label: "Hero sentence", type: "textarea", rows: 2, wide: true },
      { key: "heroImage", label: "Hero photograph", type: "image", wide: true, hint: "Portrait or wide, one garment clearly visible." },
      { key: "offerTitle", label: "Offer headline", type: "text" },
      { key: "offerText", label: "Offer sentence", type: "textarea", rows: 2, wide: true },
      { key: "offerImage", label: "Offer photograph", type: "image", wide: true },
      { key: "announcement", label: "Announcement bar", type: "text", placeholder: "Free delivery over ₹1,999" },
      { key: "announcementEnabled", label: "Show announcement bar", type: "toggle" },
    ],
  },
  {
    id: "contact",
    title: "Where to find you",
    description: "Shown in the footer, on the contact page and in every order confirmation.",
    fields: [
      { key: "phone", label: "Shop phone", type: "tel", check: "mobile", placeholder: "+91 98250 41188" },
      { key: "whatsapp", label: "WhatsApp number", type: "tel", check: "mobile", placeholder: "9825041188", hint: "Ten digits, no +91. Used for the chat button." },
      { key: "whatsappEnabled", label: "Show the WhatsApp button", type: "toggle" },
      { key: "whatsappGreeting", label: "WhatsApp opening line", type: "text", wide: true },
      { key: "email", label: "Email", type: "email", placeholder: "care@yourshop.in" },
      { key: "hours", label: "Opening hours", type: "text", wide: true, placeholder: "Mon–Sat 10:30–21:00 · Sun by appointment" },
      { key: "addressLine1", label: "Address line 1", type: "text", wide: true },
      { key: "addressLine2", label: "Address line 2", type: "text", wide: true },
      { key: "city", label: "City", type: "text" },
      { key: "state", label: "State", type: "text" },
      { key: "pin", label: "PIN code", type: "text", check: "pin" },
      { key: "mapUrl", label: "Map link", type: "url", wide: true },
      { key: "instagram", label: "Instagram", type: "url", wide: true },
      { key: "facebook", label: "Facebook", type: "url", wide: true },
      { key: "youtube", label: "YouTube", type: "url", wide: true },
    ],
  },
  {
    id: "delivery",
    title: "Delivery and payments",
    description: "These numbers are what the cart quotes. There is no second copy anywhere.",
    fields: [
      { key: "deliveryFee", label: "Delivery charge", type: "money", check: "positive" },
      { key: "freeDeliveryOver", label: "Free delivery above", type: "money", check: "positive", hint: "0 switches the threshold off." },
      { key: "minOrderValue", label: "Minimum order value", type: "money", check: "positive", hint: "Checkout refuses baskets below this." },
      { key: "codFee", label: "Cash-on-delivery fee", type: "money", check: "positive" },
      { key: "codEnabled", label: "Allow cash on delivery", type: "toggle" },
      { key: "onlineEnabled", label: "Allow online payment", type: "toggle", hint: "Leave off until a payment gateway is connected — checkout then shows a clear “pay at delivery” message." },
      { key: "dispatchDays", label: "Days to dispatch", type: "number", check: "positive" },
      { key: "deliveryDaysMin", label: "Fastest delivery (days)", type: "number", check: "positive" },
      { key: "deliveryDaysMax", label: "Slowest delivery (days)", type: "number", check: "positive" },
      { key: "returnWindowDays", label: "Return window (days)", type: "number", check: "positive" },
      { key: "gstNumber", label: "GSTIN", type: "text", check: "gst", placeholder: "24ABCDE1234F1Z5" },
      { key: "gstState", label: "GST state", type: "text", placeholder: "Gujarat" },
    ],
  },
  {
    id: "policy",
    title: "What you promise",
    description: "These four pages are the shop’s word to the customer. {placeholders} are filled from the settings above.",
    fields: [
      { key: "shippingPolicy", label: "Shipping policy", type: "textarea", rows: 6, wide: true },
      { key: "returnPolicy", label: "Return policy", type: "textarea", rows: 6, wide: true },
      { key: "privacyPolicy", label: "Privacy policy", type: "textarea", rows: 6, wide: true },
      { key: "terms", label: "Terms of sale", type: "textarea", rows: 6, wide: true },
      { key: "footerNote", label: "Footer note", type: "text", wide: true, placeholder: "GST 18% included in all displayed prices." },
    ],
  },
];

export type SettingsValues = Record<string, string | number | boolean>;

/**
 * One save for the whole shop configuration. Every field on this screen writes the
 * same key the storefront reads, so "saved" genuinely means "live" — there is no
 * second place where the delivery charge is hiding.
 */
export function SettingsForm({ settings }: { settings: SettingsValues }) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState<Record<string, string | boolean>>(() => normalise(settings));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [open, setOpen] = useState<string>("identity");

  const dirty = useMemo(() => {
    const initial = normalise(settings);
    return GROUPS.some((group) => group.fields.some((field) => String(values[field.key] ?? "") !== String(initial[field.key] ?? "")));
  }, [values, settings]);

  const set = (key: string, value: string | boolean) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: "" } : current));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setServerError(null);

    const local: Record<string, string> = {};
    for (const group of GROUPS) {
      for (const field of group.fields) {
        const raw = values[field.key];
        if (field.required && String(raw ?? "").trim().length < 2) local[field.key] = "This one is needed.";
        if (field.check === "pin" && String(raw ?? "") && !/^\d{6}$/.test(String(raw))) local[field.key] = "Six digits, e.g. 395002.";
        if (field.check === "mobile" && String(raw ?? "").replace(/\D/g, "").length < 10) local[field.key] = "Needs a full 10-digit number.";
        if (field.check === "gst" && String(raw ?? "") && !/^[0-9A-Z]{15}$/.test(String(raw).toUpperCase())) local[field.key] = "A GSTIN is 15 characters, e.g. 24ABCDE1234F1Z5.";
        if (field.check === "positive" && String(raw ?? "") !== "" && (Number.isNaN(Number(raw)) || Number(raw) < 0)) local[field.key] = "Amounts are numbers in rupees — no symbols.";
      }
    }
    setErrors(local);
    if (Object.keys(local).length > 0) {
      const firstGroup = GROUPS.find((group) => group.fields.some((field) => local[field.key]));
      if (firstGroup) setOpen(firstGroup.id);
      setServerError("A few fields need attention before this can be saved.");
      return;
    }

    const body: SettingsValues = {};
    for (const group of GROUPS) {
      for (const field of group.fields) {
        const raw = values[field.key];
        if (field.type === "toggle") body[field.key] = raw === true || raw === "true";
        else if (field.type === "money" || field.type === "number") body[field.key] = Number(raw) || 0;
        else body[field.key] = String(raw ?? "").trim();
      }
    }

    setBusy(true);
    try {
      const result = await api.put<{ ok: boolean; settings: SettingsValues }>("/api/admin/settings", body);
      setValues(normalise(result.settings));
      setSavedAt(new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }));
      toast.push({ title: "Saved", description: "The shop is showing the new wording already.", tone: "good" });
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors(caught.fields ?? {});
        setServerError(caught.message);
      } else {
        setServerError("We could not reach the shop. Nothing was changed — try again in a moment.");
      }
    } finally {
      setBusy(false);
    }
  };

  const freeOver = Number(values.freeDeliveryOver) || 0;
  const minOrder = Number(values.minOrderValue) || 0;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {GROUPS.map((group) => {
        const expanded = open === group.id;
        return (
          <section key={group.id} className="admin-card overflow-hidden" aria-labelledby={`set-${group.id}`}>
            <button
              type="button"
              onClick={() => setOpen(expanded ? "" : group.id)}
              aria-expanded={expanded}
              className="flex w-full items-start justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-sand/60 sm:px-5"
            >
              <span>
                <span id={`set-${group.id}`} className="block text-[14px] font-semibold text-ink">
                  {group.title}
                </span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">{group.description}</span>
              </span>
              <span className="mt-0.5 shrink-0 text-[11.5px] text-muted">{expanded ? "Close" : "Edit"}</span>
            </button>

            {expanded ? (
              <div className="grid gap-4 border-t border-line px-4 pb-5 pt-4 sm:grid-cols-2 sm:px-5">
                {group.fields.map((field) => (
                  <SettingField key={field.key} field={field} value={values[field.key]} error={errors[field.key]} onChange={set} />
                ))}
              </div>
            ) : (
              <p className="border-t border-line px-4 py-2 text-[11.5px] text-muted sm:px-5">{previewFor(group, values)}</p>
            )}
          </section>
        );
      })}

      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-sm)] bg-sand px-4 py-3 text-[12px] text-graphite">
        <span>
          Cart will quote:{" "}
          <span className="nums font-medium text-ink">
            {freeOver > 0 ? `free delivery over ${money(freeOver)}` : "delivery on every order"}
          </span>
          {minOrder > 0 ? <span className="nums"> · minimum basket {money(minOrder)}</span> : null}
          {values.codEnabled === true ? <span> · cash on delivery</span> : null}
          {values.onlineEnabled === true ? <span> · online payment</span> : <span className="text-muted"> · online payment off</span>}
        </span>
      </div>

      {serverError ? (
        <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-bad/25 bg-bad-tint px-3 py-2.5 text-[12.5px] leading-relaxed text-bad">
          <IconAlert size={14} className="mt-0.5 shrink-0" />
          {serverError}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button type="submit" variant="solid" size="md" loading={busy} disabled={!dirty}>
          {dirty ? "Save settings" : "Everything saved"}
        </Button>
        {dirty ? (
          <button type="button" onClick={() => setValues(normalise(settings))} className="text-[12.5px] text-muted underline decoration-line underline-offset-4 hover:text-ink">
            Discard my changes
          </button>
        ) : null}
        {savedAt ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-good">
            <IconCheck size={13} /> Saved at {savedAt}
          </span>
        ) : null}
      </div>
    </form>
  );
}

function SettingField({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldDef;
  value: string | boolean | undefined;
  error?: string;
  onChange: (key: string, value: string | boolean) => void;
}) {
  const id = `set-${field.key}`;

  if (field.type === "toggle") {
    return (
      <label className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-sm)] border px-3 py-2.5 transition-colors", value ? "border-ink bg-sand" : "border-line", field.wide && "sm:col-span-2")}>
        <span>
          <span className="block text-[12.5px] font-medium text-ink">{field.label}</span>
          {field.hint ? <span className="mt-0.5 block text-[11px] leading-snug text-muted">{field.hint}</span> : null}
        </span>
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(field.key, event.target.checked)}
          className="h-4 w-4 shrink-0 accent-[var(--color-ink)]"
          aria-label={field.label}
        />
      </label>
    );
  }

  if (field.type === "image") {
    return (
      <div className="sm:col-span-2">
        <p className="mb-2 text-[12.5px] font-medium text-ink">{field.label}</p>
        <SingleImageField value={String(value ?? "")} onChange={(next) => onChange(field.key, next)} label={field.label} hint={field.hint} aspect={field.key === "logoImage" ? "square" : "wide"} />
      </div>
    );
  }

  const input =
    field.type === "textarea" ? (
      <Textarea id={id} rows={field.rows ?? 4} value={String(value ?? "")} onChange={(event) => onChange(field.key, event.target.value)} invalid={Boolean(error)} placeholder={field.placeholder} />
    ) : (
      <Input
        id={id}
        type={field.type === "email" ? "email" : field.type === "tel" ? "tel" : field.type === "url" ? "url" : field.type === "number" ? "number" : "text"}
        inputMode={field.type === "money" || field.type === "number" ? "numeric" : undefined}
        prefix={field.type === "money" ? "₹" : undefined}
        value={String(value ?? "")}
        onChange={(event) => onChange(field.key, field.type === "money" || field.type === "number" ? event.target.value.replace(/[^\d.]/g, "") : event.target.value)}
        invalid={Boolean(error)}
        placeholder={field.placeholder}
      />
    );

  return (
    <Field label={field.label} required={field.required} htmlFor={id} hint={field.hint} error={error} className={field.wide ? "sm:col-span-2" : undefined}>
      {input}
    </Field>
  );
}

function normalise(settings: SettingsValues): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const group of GROUPS) {
    for (const field of group.fields) {
      const raw = settings[field.key];
      if (field.type === "toggle") out[field.key] = raw === true || raw === "true";
      else out[field.key] = raw === null || raw === undefined ? "" : String(raw);
    }
  }
  return out;
}

/** Collapsed groups still tell you what is set, so you know where to click. */
function previewFor(group: Group, values: Record<string, string | boolean>) {
  const parts = group.fields
    .filter((field) => field.type !== "toggle" && field.type !== "image" && field.type !== "textarea")
    .slice(0, 6)
    .map((field) => {
      const raw = String(values[field.key] ?? "").trim();
      if (!raw) return null;
      return `${field.label}: ${raw.length > 34 ? `${raw.slice(0, 34)}…` : raw}`;
    })
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : "Nothing set yet — open this group to fill it in.";
}
