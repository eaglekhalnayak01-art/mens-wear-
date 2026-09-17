"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Stepper, CHECKOUT_STEPS } from "@/components/checkout/stepper";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { EmptyState, Skeleton } from "@/components/ui/empty-state";
import { IconAlert, IconCheck, IconLock, IconTruck } from "@/components/ui/icons";
import { Price } from "@/components/ui/price";
import { SafeImage } from "@/components/ui/safe-image";
import { useCart } from "@/components/cart/cart-provider";
import type { QuoteTotals } from "@/components/cart/cart-provider";
import { useSession } from "@/components/account/session-provider";
import { api, ApiError } from "@/lib/client-api";
import type { AddressRow } from "@/server/repositories/customers.repository";
import { money, normalizeMobile, isValidMobile, formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import { IN_STATES } from "@/lib/india";

export type CheckoutSettings = {
  codEnabled: boolean;
  onlineEnabled: boolean;
  deliveryFee: number;
  freeDeliveryOver: number;
  minOrderValue: number;
  codFee: number;
  dispatchDays: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  whatsapp: string;
  shopName: string;
  /** How online payment works today: a UPI id + QR the owner uploaded, or a gateway. */
  onlineMode?: "gateway" | "qr" | "off";
  upiId?: string;
  upiPayeeName?: string;
  upiQrImage?: string | null;
  paymentInstructions?: string;
  utrRequired?: boolean;
};

/** A UPI deep link: opens GPay/PhonePe/Paytm with the amount and note filled in. */
function upiIntent(settings: CheckoutSettings, total: number) {
  if (!settings.upiId) return null;
  const params = new URLSearchParams({
    pa: settings.upiId,
    pn: settings.upiPayeeName || settings.shopName,
    cu: "INR",
  });
  if (total > 0) params.set("am", String(total));
  params.set("tn", `Order ${settings.shopName}`);
  return `upi://pay?${params.toString()}`;
}

type Form = {
  name: string;
  mobile: string;
  email: string;
  recipient: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pin: string;
  landmark: string;
  notes: string;
  saveAddress: boolean;
};

const EMPTY_FORM: Form = {
  name: "",
  mobile: "",
  email: "",
  recipient: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "Gujarat",
  pin: "",
  landmark: "",
  notes: "",
  saveAddress: false,
};

const STORAGE_KEY = "amw.checkout.v1";

/**
 * Guest-first checkout: four screens, no registration, and only the fields a
 * courier actually needs. Every rupee shown here is re-derived by the server on
 * submit — this form is a request, not an invoice.
 */
export function CheckoutFlow({ settings }: { settings: CheckoutSettings }) {
  const router = useRouter();
  const { items, totals, ready, setQty, remove, clear, revalidate } = useCart();
  const { customer } = useSession();

  const [step, setStep] = useState(0);
  const [reachable, setReachable] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saved, setSaved] = useState<AddressRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteTotals | null>(null);
  const [quoting, setQuoting] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [payment, setPayment] = useState<"cod" | "online">("cod");
  const [utr, setUtr] = useState("");

  const [hydrated, setHydrated] = useState(false);
  const firstError = useRef<HTMLDivElement>(null);

  // Restore a saved address so a returning shopper does not retype it.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setForm((current) => ({ ...current, ...JSON.parse(saved) }));
    } catch {
      /* ignore a malformed blob */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      /* storage may be full or blocked; the form still works in memory */
    }
  }, [form, hydrated]);

  useEffect(() => {
    if (!customer) {
      setSaved([]);
      return;
    }
    api
      .get<{ addresses: AddressRow[] }>("/api/store/account/addresses")
      .then((data) => setSaved(data.addresses ?? []))
      .catch(() => setSaved([]));
  }, [customer]);

  useEffect(() => {
    if (customer && !form.name && customer.name) {
      setForm((current) => ({ ...current, name: customer.name ?? "", mobile: customer.mobile, phone: current.phone || customer.mobile }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  const lines = useMemo(() => items.map((item) => ({ variantId: item.variantId, qty: item.qty })), [items]);

  const refreshQuote = useCallback(async () => {
    if (lines.length === 0) {
      setQuote(null);
      setQuoting(false);
      return;
    }
    setQuoting(true);
    try {
      const data = await api.post<QuoteTotals>("/api/store/cart/quote", { items: lines, paymentMethod: payment });
      setQuote(data);
      setBanner(null);
    } catch (error) {
      setBanner(error instanceof ApiError ? error.message : "We could not reach the shop right now. Check your connection and try again.");
    } finally {
      setQuoting(false);
    }
  }, [lines, payment]);

  useEffect(() => {
    void refreshQuote();
  }, [refreshQuote]);

  const shown = quote ?? totals;
  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  };

  const validateStep = (index: number) => {
    const found: Record<string, string> = {};
    if (index === 0) {
      if (form.name.trim().length < 2) found.name = "Please tell us who this is for.";
      if (!isValidMobile(form.mobile)) found.mobile = "Enter the 10-digit mobile number the courier should call.";
      if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) found.email = "That email does not look right — you can leave it blank.";
    }
    if (index === 1) {
      if (form.recipient.trim().length < 2) found.recipient = "Name on the parcel.";
      if (!isValidMobile(form.phone)) found.phone = "A working number for the delivery partner.";
      if (form.line1.trim().length < 6) found.line1 = "House or flat number and street, please.";
      if (form.city.trim().length < 2) found.city = "City is required.";
      if (form.state.trim().length < 2) found.state = "State is required.";
      if (!/^\d{6}$/.test(form.pin.trim())) found.pin = "PIN code must be 6 digits.";
    }
    if (index === 2 && lines.length === 0) {
      found.items = "Your cart is empty.";
    }
    return found;
  };

  const goNext = async () => {
    const found = validateStep(step);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      window.setTimeout(() => (firstError.current?.querySelector("input,textarea,select") as HTMLElement | null)?.focus(), 30);
      return;
    }
    const next = Math.min(CHECKOUT_STEPS.length - 1, step + 1);
    setStep(next);
    setReachable((current) => Math.max(current, next));
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (next === 2) void refreshQuote();
  };

  const goBack = () => {
    setStep((current) => Math.max(0, current - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const placeOrder = async () => {
    // A prepaid order without a reference is a phone call waiting to happen, so when
    // the shop switched this on we ask before the request goes out.
    if (payment === "online" && settings.utrRequired && utr.trim().length < 6) {
      setStep(CHECKOUT_STEPS.findIndex((entry) => entry.id === "payment"));
      setErrors((current) => ({ ...current, paymentReference: "Type the UPI reference (UTR) from your payment app." }));
      setBanner("We need the UPI reference before we can confirm a prepaid order.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setPlacing(true);
    setBanner(null);
    try {
      const data = await api.post<{ order: { ref: string; total: number; trackPath?: string } }>("/api/store/orders", {
        customer: { name: form.name.trim(), mobile: normalizeMobile(form.mobile), email: form.email.trim() || undefined },
        shipping: {
          recipient: form.recipient.trim(),
          phone: normalizeMobile(form.phone || form.mobile),
          line1: form.line1.trim(),
          line2: form.line2.trim() || undefined,
          city: form.city.trim(),
          state: form.state.trim(),
          pin: form.pin.trim(),
          landmark: form.landmark.trim() || undefined,
        },
        paymentMethod: payment,
        paymentReference: payment === "online" ? utr.trim() || undefined : undefined,
        notes: form.notes.trim() || undefined,
        saveAddress: customer ? form.saveAddress : false,
        items: lines,
      });
      clear();
      try {
        localStorage.setItem("amw.lastOrder", data.order.ref);
      } catch {
        /* non-essential */
      }
      router.push(data.order.trackPath ?? `/order/${data.order.ref}`);
    } catch (error) {
      if (error instanceof ApiError) {
        const fields = error.fields ?? {};
        setErrors(fields);
        const touchesAddress = ["recipient", "phone", "line1", "line2", "city", "state", "pin", "landmark", "shipping"].some((key) => fields[key]);
        const touchesPayment = Object.keys(fields).some((key) => key.startsWith("payment"));
        if (touchesAddress) setStep(1);
        else if (touchesPayment) setStep(3);
        else if (Object.keys(fields).length > 0) setStep(0);
        setBanner(error.code === "out_of_stock" ? error.message : error.message);
        if (error.code === "out_of_stock" || error.code === "conflict") void revalidate();
      } else {
        setBanner("We could not place the order. No money has moved. Please try once more, or call the shop if it keeps failing.");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setPlacing(false);
    }
  };

  if (!ready) {
    return (
      <div className="shop-shell py-14">
        <Skeleton className="h-6 w-52" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-[420px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="shop-shell py-16">
        <EmptyState
          icon={<IconTruck size={22} />}
          title="There is nothing to check out yet"
          description="Your cart emptied itself — the pieces may still be in the shop, just not in the bag."
          action={
            <Link
              href="/shop"
              className="inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-ink px-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-bone transition-colors hover:bg-ink-soft"
            >
              Back to the rail
            </Link>
          }
        />
      </div>
    );
  }

  const shortfall = settings.minOrderValue - (shown.subtotal ?? 0);
  const freeGap = (shown.freeShippingGap ?? 0) > 0 ? settings.freeDeliveryOver - (shown.subtotal ?? 0) : 0;

  return (
    <div className="shop-shell py-8 md:py-12">
      <div className="mx-auto max-w-[1080px]">
        <header className="mb-7">
          <p className="eyebrow mb-2">Checkout</p>
          <h1 className="font-display text-[clamp(1.7rem,1.3rem+1.4vw,2.4rem)] leading-[1.1] text-ink">
            {CHECKOUT_STEPS[step].label}
          </h1>
          <p className="mt-2 max-w-[60ch] text-[13.5px] leading-relaxed text-muted">
            {step === 0
              ? "No account needed. We use your mobile number to link this order and send the tracking updates — that is all."
              : step === 1
                ? "The courier calls this number, so keep it reachable on the delivery day."
                : step === 2
                  ? "Check the sizes and quantities once. Stock moves during the day, and we will call before dispatch if anything changed."
                  : "Pay the delivery partner in cash, or on WhatsApp if you prefer UPI. No card details are ever sent to us."}
          </p>
        </header>

        <div className="border-b border-line pb-1">
          <Stepper current={step} reachable={reachable} onJump={setStep} />
        </div>

        {banner ? (
          <div role="alert" className="mt-6 flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-bad/25 bg-bad-tint px-4 py-3 text-[13px] leading-relaxed text-bad">
            <IconAlert size={16} className="mt-0.5 shrink-0" />
            <span>
              {banner}
              {quote?.notices?.length ? (
                <span className="mt-1 block text-[12.5px] text-ink-soft">
                  Updated your cart from the shop: {quote.notices.join(" · ")}
                </span>
              ) : null}
            </span>
          </div>
        ) : null}

        <div className="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] lg:gap-10">
          <div ref={firstError}>
            {step === 0 ? (
              <StepDetails form={form} set={set} errors={errors} signedIn={Boolean(customer)} />
            ) : step === 1 ? (
              <StepAddress form={form} set={set} errors={errors} addresses={saved} signedIn={Boolean(customer)} onPick={applyAddress(setForm)} />
            ) : step === 2 ? (
              <StepReview
                form={form}
                items={items}
                errors={errors}
                onChangeQty={setQty}
                onRemove={remove}
                onNotes={(value) => set("notes", value)}
                quoting={quoting}
                settings={settings}
              />
            ) : (
              <StepPayment
                settings={settings}
                payment={payment}
                setPayment={setPayment}
                totals={shown}
                utr={utr}
                setUtr={setUtr}
                error={errors.utr ?? errors.paymentReference}
              />
            )}

            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              {step > 0 ? (
                <Button variant="light" size="md" onClick={goBack} disabled={placing}>
                  Back
                </Button>
              ) : (
                <Link href="/cart" className="text-[12.5px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink">
                  Back to cart
                </Link>
              )}
              {step < CHECKOUT_STEPS.length - 1 ? (
                <Button variant="solid" size="md" onClick={goNext} disabled={shortfall > 0}>
                  Continue
                </Button>
              ) : (
                <Button variant="solid" size="lg" onClick={placeOrder} loading={placing} disabled={shortfall > 0 || quoting} iconLeft={<IconLock size={14} />}>
                  {payment === "cod" ? `Place order · ${money(shown.total ?? 0)}` : `Pay ${money(shown.total ?? 0)}`}
                </Button>
              )}
              {shortfall > 0 ? (
                <p className="text-[12.5px] text-bad">Minimum order is {money(settings.minOrderValue)} — add {money(shortfall)} more.</p>
              ) : null}
            </div>
          </div>

          <SummaryCard
            lines={items.map((item) => ({
              id: item.variantId,
              name: item.name,
              image: item.image,
              size: item.size,
              color: item.color,
              qty: item.qty,
              unitPrice: item.unitPrice,
            }))}
            totals={shown}
            quoting={quoting}
            settings={settings}
            freeGap={freeGap}
            payment={payment}
          />
        </div>
      </div>
    </div>
  );
}

function applyAddress(setForm: React.Dispatch<React.SetStateAction<Form>>) {
  return (address: AddressRow) =>
    setForm((current) => ({
      ...current,
      recipient: address.recipient ?? current.recipient,
      phone: address.phone ?? current.phone,
      line1: address.line1 ?? "",
      line2: address.line2 ?? "",
      city: address.city ?? "",
      state: address.state ?? current.state,
      pin: address.pin ?? "",
      landmark: address.landmark ?? "",
    }));
}

function StepDetails({
  form,
  set,
  errors,
  signedIn,
}: {
  form: Form;
  set: (key: keyof Form, value: any) => void;
  errors: Record<string, string>;
  signedIn: boolean;
}) {
  return (
    <div className="card-surface p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={errors.name} htmlFor="co-name">
          <Input id="co-name" name="name" autoComplete="name" placeholder="Rohit Mehta" value={form.name} onChange={(e) => set("name", e.target.value)} invalid={Boolean(errors.name)} />
        </Field>
        <Field label="Mobile number" required error={errors.mobile} hint="For delivery updates only. We never call to sell." htmlFor="co-mobile">
          <Input
            id="co-mobile"
            name="mobile"
            inputMode="numeric"
            autoComplete="tel"
            prefix="+91"
            placeholder="98250 41188"
            value={form.mobile}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
              set("mobile", digits);
              if (!form.phone || form.phone === form.name) set("phone", digits);
            }}
            invalid={Boolean(errors.mobile)}
          />
        </Field>
        <Field label="Email" optionalLabel className="sm:col-span-2" error={errors.email} hint="Optional — only used for the invoice and tracking link." htmlFor="co-email">
          <Input id="co-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} invalid={Boolean(errors.email)} />
        </Field>
      </div>

      <p className="mt-5 flex items-start gap-2 border-t border-line pt-4 text-[12.5px] leading-relaxed text-muted">
        <IconLock size={14} className="mt-0.5 shrink-0 text-brass" />
        {signedIn
          ? "You are signed in, so this order will appear in your account and the address can be saved for next time."
          : "You do not need an account. Order as a guest and sign in with a code later using the same mobile number — the order will move into your account."}
      </p>
    </div>
  );
}

function StepAddress({
  form,
  set,
  errors,
  addresses,
  signedIn,
  onPick,
}: {
  form: Form;
  set: (key: keyof Form, value: any) => void;
  errors: Record<string, string>;
  addresses: AddressRow[];
  signedIn: boolean;
  onPick: (address: AddressRow) => void;
}) {
  return (
    <div className="card-surface p-5 sm:p-6">
      {addresses.length > 0 ? (
        <div className="mb-5 border-b border-line pb-4">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Saved addresses</p>
          <div className="flex flex-wrap gap-2">
            {addresses.map((address) => (
              <button
                key={address.id}
                type="button"
                onClick={() => onPick(address)}
                className="rounded-[var(--radius-sm)] border border-line bg-paper px-3 py-2 text-left text-[12.5px] leading-snug text-graphite transition-colors hover:border-ink hover:text-ink"
              >
                <span className="block font-semibold text-ink">{address.label ?? "Address"}</span>
                {address.line1}, {address.city} {address.pin}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name on the parcel" required error={errors.recipient} htmlFor="co-recipient">
          <Input id="co-recipient" value={form.recipient} placeholder="Same as above" onChange={(e) => set("recipient", e.target.value)} invalid={Boolean(errors.recipient)} />
        </Field>
        <Field label="Delivery phone" required error={errors.phone} hint="The number the courier dials." htmlFor="co-phone">
          <Input id="co-phone" inputMode="numeric" prefix="+91" value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} invalid={Boolean(errors.phone)} />
        </Field>
        <Field label="Flat / house no. and street" required error={errors.line1} className="sm:col-span-2" htmlFor="co-line1">
          <Input id="co-line1" autoComplete="address-line1" placeholder="B-402, Shrinand Residency, Varachha Road" value={form.line1} onChange={(e) => set("line1", e.target.value)} invalid={Boolean(errors.line1)} />
        </Field>
        <Field label="Area / landmark (2nd line)" className="sm:col-span-2" htmlFor="co-line2">
          <Input id="co-line2" autoComplete="address-line2" placeholder="Near Sabji Mandir gate 2" value={form.line2} onChange={(e) => set("line2", e.target.value)} />
        </Field>
        <Field label="City" required error={errors.city} htmlFor="co-city">
          <Input id="co-city" autoComplete="address-level2" value={form.city} onChange={(e) => set("city", e.target.value)} invalid={Boolean(errors.city)} />
        </Field>
        <Field label="State" required error={errors.state} htmlFor="co-state">
          <Select id="co-state" value={form.state} onChange={(e) => set("state", e.target.value)} invalid={Boolean(errors.state)}>
            {IN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="PIN code" required error={errors.pin} htmlFor="co-pin">
          <Input id="co-pin" inputMode="numeric" autoComplete="postal-code" placeholder="395002" value={form.pin} onChange={(e) => set("pin", e.target.value.replace(/\D/g, "").slice(0, 6))} invalid={Boolean(errors.pin)} />
        </Field>
        <Field label="Landmark" className="sm:col-span-1" htmlFor="co-landmark" hint="Helps more than a second address line.">
          <Input id="co-landmark" placeholder="Opposite City Hospital" value={form.landmark} onChange={(e) => set("landmark", e.target.value)} />
        </Field>
      </div>

      {signedIn ? (
        <div className="mt-4">
          <Checkbox label="Save this address to my account" checked={form.saveAddress} onChange={(e) => set("saveAddress", e.target.checked)} />
        </div>
      ) : null}
    </div>
  );
}

function StepReview({
  items,
  onChangeQty,
  onRemove,
  form,
  onNotes,
  errors,
  quoting,
  settings,
}: {
  items: ReturnType<typeof useCart>["items"];
  onChangeQty: (variantId: number, qty: number) => void;
  onRemove: (variantId: number) => void;
  form: Form;
  onNotes: (value: string) => void;
  errors: Record<string, string>;
  quoting: boolean;
  settings: CheckoutSettings;
}) {
  return (
    <div className="card-surface overflow-hidden">
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <li key={item.variantId} className="flex gap-3.5 p-4 sm:p-5">
            <SafeImage src={item.image} alt="" className="h-[86px] w-[68px] shrink-0 rounded-[var(--radius-xs)]" sizes="68px" />
            <div className="min-w-0 flex-1">
              <Link href={`/product/${item.slug}`} className="text-[13.5px] font-medium leading-snug text-ink hover:text-brass-deep">
                {item.name}
              </Link>
              <p className="mt-1 text-[12px] text-muted">
                {item.size ? `Size ${item.size}` : "One size"}
                {item.color ? ` · ${item.color}` : ""}
                {item.availableStock !== undefined ? ` · ${item.availableStock} in stock` : ""}
              </p>
              <div className="mt-2.5 flex items-center gap-3">
                <div className="flex items-center rounded-[var(--radius-xs)] border border-line">
                  <button type="button" onClick={() => onChangeQty(item.variantId, item.qty - 1)} aria-label={`Reduce ${item.name}`} className="grid h-8 w-8 place-items-center text-ink transition-colors hover:bg-sand">
                    −
                  </button>
                  <span className="nums w-7 text-center text-[13px]">{item.qty}</span>
                  <button
                    type="button"
                    onClick={() => onChangeQty(item.variantId, item.qty + 1)}
                    disabled={item.availableStock !== undefined && item.qty >= Math.min(10, item.availableStock)}
                    aria-label={`Increase ${item.name}`}
                    className="grid h-8 w-8 place-items-center text-ink transition-colors hover:bg-sand disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
                <button type="button" onClick={() => onRemove(item.variantId)} className="text-[12px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-bad">
                  Remove
                </button>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <Price price={item.unitPrice * item.qty} size="sm" />
              {item.compareAtPrice ? <p className="nums mt-1 text-[11.5px] text-muted">{formatPrice(item.compareAtPrice * item.qty)}</p> : null}
            </div>
          </li>
        ))}
      </ul>

      {quoting ? (
        <p className="border-t border-line px-5 py-2.5 text-[12px] text-muted">Checking stock and shipping with the shop…</p>
      ) : items.some((item) => item.availableStock !== undefined && item.qty > item.availableStock) ? (
        <p className="border-t border-line bg-warn-tint px-5 py-2.5 text-[12.5px] text-warn">
          Some sizes have fewer pieces than your cart. Reduce the quantity or we will call you before dispatch.
        </p>
      ) : (
        <p className="border-t border-line px-5 py-2.5 text-[12.5px] text-muted">
          {settings.dispatchDays} working day(s) to pack, then {settings.deliveryDaysMin}–{settings.deliveryDaysMax} days to {form.city || "your city"}.
        </p>
      )}

      <div className="border-t border-line p-5">
        <Field label="Note for the shop" htmlFor="co-notes" hint="Alterations, gift packing, a delivery day to avoid — anything we should do." error={errors.notes}>
          <Textarea id="co-notes" rows={3} placeholder="Please hem the trousers to 32 inches." value={form.notes} onChange={(e) => onNotes(e.target.value)} />
        </Field>
      </div>
    </div>
  );
}

function StepPayment({
  settings,
  payment,
  setPayment,
  totals,
  utr,
  setUtr,
  error,
}: {
  settings: CheckoutSettings;
  payment: "cod" | "online";
  setPayment: (value: "cod" | "online") => void;
  totals: QuoteTotals;
  utr: string;
  setUtr: (value: string) => void;
  error?: string;
}) {
  const qrMode = settings.onlineMode === "qr" && Boolean(settings.upiId);
  const onlineAvailable = settings.onlineEnabled && (qrMode || settings.onlineMode === "gateway");
  const options = [
    {
      id: "cod" as const,
      title: "Cash on delivery",
      text: `Pay ${money(totals.total ?? 0)} in cash when the parcel arrives. Keep the exact amount ready — delivery partners rarely carry change.`,
      available: settings.codEnabled && totals.allowsCod !== false,
      unavailable:
        totals.allowsCod === false
          ? "Not available — one of your items is prepaid only."
          : "We are not taking cash-on-delivery orders right now.",
      badge: settings.codFee > 0 ? `+ ${money(settings.codFee)} handling` : "No extra charge",
    },
    {
      id: "online" as const,
      title: qrMode ? "Pay by UPI to our QR" : "UPI, card or net banking",
      text: onlineAvailable
        ? qrMode
          ? "Scan the QR below in any UPI app, pay the exact total, then type the reference number here. We confirm within a few hours."
          : "You will be handed to the payment gateway and brought straight back here."
        : "Online payment is being set up. Choose cash on delivery, or we will send a payment link on WhatsApp.",
      available: onlineAvailable && totals.allowsOnline !== false,
      unavailable:
        totals.allowsOnline === false
          ? "Not available — one of your items is cash on delivery only."
          : "Online payment is not open yet.",
      badge: onlineAvailable ? (qrMode ? "Instant confirmation" : undefined) : "Coming soon",
    },
  ];

  const intent = upiIntent(settings, totals.total ?? 0);

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const disabled = !option.available;
        return (
          <div key={option.id} className="space-y-3">
            <label
              className={cn(
                "flex cursor-pointer gap-3.5 rounded-[var(--radius-md)] border p-4 transition-colors sm:p-5",
                payment === option.id && !disabled ? "border-ink bg-paper" : "border-line bg-paper hover:border-ink/60",
                disabled && "cursor-not-allowed opacity-60 hover:border-line",
              )}
            >
              <input
                type="radio"
                name="payment"
                className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--color-brass)]"
                checked={payment === option.id && !disabled}
                disabled={disabled}
                onChange={() => setPayment(option.id)}
              />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-ink">
                  {option.title}
                  {option.badge ? (
                    <span className={cn("rounded-full px-2 py-[3px] text-[10.5px] font-semibold uppercase tracking-[0.06em]", disabled ? "bg-sand text-muted" : "bg-brass-tint text-brass-deep")}>
                      {option.badge}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1.5 block text-[13px] leading-relaxed text-muted">{option.text}</span>
                {disabled && option.unavailable ? (
                  <span className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] text-graphite">
                    <IconAlert size={13} className="text-brass" /> {option.unavailable}
                  </span>
                ) : null}
              </span>
            </label>

            {option.id === "online" && payment === "online" && qrMode ? (
              <div className="rounded-[var(--radius-md)] border border-brass/35 bg-bone p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brass-deep">
                  Pay {money(totals.total ?? 0)} to {settings.shopName}
                </p>
                <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
                  {settings.upiQrImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.upiQrImage}
                      alt={`${settings.shopName} UPI payment QR code`}
                      className="h-[168px] w-[168px] shrink-0 rounded-[var(--radius-sm)] border border-line bg-white object-contain p-2"
                    />
                  ) : (
                    <div className="flex h-[168px] w-[168px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-dashed border-line bg-paper px-4 text-center text-[11.5px] leading-relaxed text-muted">
                      The shop has not uploaded a QR image yet — pay to the UPI id below from any UPI app.
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-3">
                    <CopyRow label="UPI ID" value={settings.upiId ?? ""} />
                    {settings.upiPayeeName ? <p className="text-[12.5px] text-graphite">Payee name: {settings.upiPayeeName}</p> : null}
                    {settings.paymentInstructions ? (
                      <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-graphite">{settings.paymentInstructions}</p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      {intent ? (
                        <a
                          href={intent}
                          className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-[12.5px] font-semibold text-paper transition-colors hover:bg-brass"
                        >
                          Open UPI app
                        </a>
                      ) : null}
                      <span className="text-[11.5px] text-muted">On a phone this opens Google Pay, PhonePe or Paytm with the amount filled in.</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-line pt-4">
                  <label htmlFor="utr" className="flex items-baseline justify-between gap-3 text-[12.5px] font-medium text-ink-soft">
                    <span>
                      UPI reference / UTR
                      {settings.utrRequired ? <span className="ml-0.5 text-bad">*</span> : null}
                    </span>
                    {settings.utrRequired ? null : <span className="text-[11px] font-normal text-muted">Optional</span>}
                  </label>
                  <Input
                    id="utr"
                    className="mt-1.5"
                    value={utr}
                    onChange={(event) => setUtr(event.target.value.replace(/[^0-9A-Za-z-]/g, "").slice(0, 40))}
                    placeholder="e.g. 448392017745"
                    inputMode="numeric"
                    autoComplete="off"
                    invalid={Boolean(error)}
                  />
                  <p className="mt-1.5 text-[12px] leading-snug text-muted">
                    {error ?? "The reference in your UPI app under “Transaction id”. It helps us find your payment and confirm sooner."}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      <ul className="space-y-1.5 rounded-[var(--radius-md)] border border-line bg-bone p-4 text-[12.5px] text-graphite">
        {[
          "We never ask for card numbers on WhatsApp or over the phone.",
          "The order is confirmed by our team before it is packed — you will get a call if a size is short.",
          "GST invoice available on request; mention it in the note.",
        ].map((line) => (
          <li key={line} className="flex gap-2">
            <IconCheck size={14} className="mt-0.5 shrink-0 text-good" />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummaryCard({
  lines,
  totals,
  quoting,
  settings,
  freeGap,
  payment,
}: {
  lines: { id: number; name: string; image: string; size: string | null; color: string | null; qty: number; unitPrice: number }[];
  totals: QuoteTotals;
  quoting: boolean;
  settings: CheckoutSettings;
  freeGap: number;
  payment: "cod" | "online";
}) {
  return (
    <aside className="lg:sticky lg:top-[104px]" aria-label="Order summary">
      <div className="card-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">Your order</p>
          <span className={cn("text-[11.5px] transition-opacity", quoting ? "text-muted" : "text-good")}>{quoting ? "Checking…" : "Confirmed with shop"}</span>
        </div>

        <ul className="divide-y divide-line-soft px-5">
          {lines.map((line) => (
            <li key={line.id} className="flex items-center gap-3 py-3">
              <SafeImage src={line.image} alt="" className="h-[54px] w-[42px] shrink-0 rounded-[4px] bg-sand" sizes="42px" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] leading-snug text-ink">{line.name}</p>
                <p className="text-[11.5px] text-muted">
                  {line.size ? `${line.size}` : "One size"}
                  {line.color ? ` · ${line.color}` : ""} · {line.qty} pc
                </p>
              </div>
              <span className="nums text-[12.5px] text-ink-soft">{money(line.unitPrice * line.qty)}</span>
            </li>
          ))}
        </ul>

        <dl className="space-y-2 border-t border-line px-5 py-4 text-[13px]">
          <Row term="Subtotal" value={money(totals.subtotal ?? 0)} />
          {totals.discount > 0 ? <Row term="Discount" value={`− ${money(totals.discount)}`} tone="good" /> : null}
          <Row term="Delivery" value={(totals.shipping ?? 0) === 0 ? "Free" : money(totals.shipping ?? 0)} />
          {payment === "cod" && settings.codFee > 0 ? <Row term="COD handling" value={money(settings.codFee)} /> : null}
          <div className="flex items-baseline justify-between border-t border-line pt-3">
            <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink">Total</dt>
            <dd className="nums font-display text-[20px] leading-none text-ink">{money(totals.total ?? 0)}</dd>
          </div>
        </dl>

        {freeGap > 0 ? (
          <p className="border-t border-line bg-sand/60 px-5 py-3 text-[12px] leading-relaxed text-graphite">
            Add {money(freeGap)} more for free delivery — {settings.freeDeliveryOver > 0 && totals.subtotal >= settings.freeDeliveryOver ? null : "everything above ₹1,999 ships at our cost."}
          </p>
        ) : (
          <p className="border-t border-line bg-good-tint px-5 py-3 text-[12px] text-good">Free delivery on this order.</p>
        )}
      </div>

      <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-relaxed text-muted">
        <IconLock size={13} className="mt-0.5 shrink-0 text-brass" />
        Prices include GST. Your details go to our packing table and the courier — nothing else.
      </p>
    </aside>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className="rounded-[var(--radius-sm)] border border-line bg-paper px-2.5 py-1 font-mono text-[13px] text-ink">{value}</span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(
            () => setCopied(true),
            () => setCopied(false),
          );
          window.setTimeout(() => setCopied(false), 1800);
        }}
        className="text-[12px] font-semibold text-brass-deep underline decoration-brass/40 underline-offset-2 hover:text-brass"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function Row({ term, value, tone }: { term: string; value: string; tone?: "good" }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted">{term}</dt>
      <dd className={cn("nums", tone === "good" ? "text-good" : "text-ink-soft")}>{value}</dd>
    </div>
  );
}

