"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { IconCheck, IconLock, IconRefresh } from "@/components/ui/icons";
import { api, ApiError } from "@/lib/client-api";
import { useSession } from "@/components/account/session-provider";
import { isValidMobile, maskMobile, normalizeMobile } from "@/lib/format";
import { cn } from "@/lib/cn";

type Phase = "mobile" | "code";

/**
 * Mobile + one-time-code sign-in. Registration and sign-in are the same screen on
 * purpose — there is no password to forget and no form to fill, and a guest's
 * earlier orders are picked up automatically because they are keyed by number.
 */
export function OtpLoginForm({ next = "/account" }: { next?: string }) {
  const router = useRouter();
  const { refresh } = useSession();
  const [phase, setPhase] = useState<Phase>("mobile");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [cooldown, setCooldown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (phase === "code") window.setTimeout(() => codeInput.current?.focus(), 60);
  }, [phase]);

  const requestCode = useCallback(
    async (purpose: "login" | "register") => {
      setError(null);
      setFieldErrors({});
      if (!isValidMobile(mobile)) {
        setFieldErrors({ mobile: "Enter the 10-digit mobile number we should link to this account." });
        return;
      }
      setBusy(true);
      try {
        const data = await api.post<{ isNewCustomer: boolean; resendAfterSeconds: number; devCode?: string; masked?: string }>("/api/store/auth/otp/request", {
          mobile: normalizeMobile(mobile),
          purpose,
        });
        setIsNew(data.isNewCustomer);
        setCooldown(data.resendAfterSeconds || 30);
        setDevCode(data.devCode ?? null);
        setSent(true);
        setPhase("code");
        setCode("");
      } catch (caught) {
        if (caught instanceof ApiError) {
          setError(caught.message);
          setFieldErrors(caught.fields ?? {});
        } else {
          setError("We could not reach the shop. Check your connection and try once more.");
        }
      } finally {
        setBusy(false);
      }
    },
    [mobile],
  );

  const verify = async () => {
    setError(null);
    setFieldErrors({});
    if (code.replace(/\D/g, "").length !== 6) {
      setFieldErrors({ code: "Six digits, please — the code in the message." });
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/store/auth/otp/verify", {
        mobile: normalizeMobile(mobile),
        code: code.replace(/\D/g, ""),
        ...(isNew ? { name: name.trim() || undefined, email: email.trim() || undefined } : {}),
      });
      await refresh();
      router.push(next);
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        const fields = caught.fields ?? {};
        setFieldErrors(fields);
        if (fields.code) {
          setCode("");
          window.setTimeout(() => codeInput.current?.focus(), 20);
        }
      } else {
        setError("We could not verify the code right now. Try once more, or call the shop.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (phase === "mobile") {
    return (
      <form
        className="card-surface p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void requestCode("login");
        }}
      >
        <h2 className="text-[17px] font-semibold text-ink">Sign in or register</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          One number, one code. No password, and nothing is asked for that a courier does not need.
        </p>

        <div className="mt-5">
          <Field label="Mobile number" required error={fieldErrors.mobile} htmlFor="login-mobile" hint="We only use it for order updates.">
            <Input
              id="login-mobile"
              inputMode="numeric"
              autoComplete="tel"
              prefix="+91"
              placeholder="98250 41188"
              value={mobile}
              invalid={Boolean(fieldErrors.mobile)}
              onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
            />
          </Field>
        </div>

        {error ? <p role="alert" className="mt-3.5 text-[12.5px] text-bad">{error}</p> : null}

        <Button type="submit" variant="solid" size="lg" fullWidth loading={busy} className="mt-5">
          Send me a code
        </Button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-muted">
          <IconLock size={12} className="text-brass" /> The code is valid for 10 minutes and works once.
        </p>
      </form>
    );
  }

  return (
    <form
      className="card-surface p-5 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        void verify();
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[17px] font-semibold text-ink">Enter your code</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            We sent a 6-digit code to <span className="nums text-ink">{sent ? maskMobile(mobile) : mobile}</span>. {isNew ? "It is your first time with us — add a name and we will address the parcel properly." : ""}
          </p>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-good-tint text-good">
          <IconCheck size={16} />
        </span>
      </div>

      {devCode ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-brass/25 bg-brass-tint px-3.5 py-2.5">
          <p className="text-[12.5px] text-brass-deep">
            Demo mode — your code is <strong className="nums font-semibold">{devCode}</strong>
          </p>
          <button type="button" onClick={() => setCode(devCode)} className="shrink-0 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-brass-deep underline underline-offset-4">
            Fill it
          </button>
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        <Field label="Verification code" required error={fieldErrors.code} htmlFor="login-code">
          <Input
            id="login-code"
            ref={codeInput}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="••••••"
            value={code}
            invalid={Boolean(fieldErrors.code)}
            className={cn("nums text-[20px] tracking-[0.42em]", fieldErrors.code && "border-bad")}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(digits);
              if (digits.length === 6 && !busy) window.setTimeout(() => void verify(), 60);
            }}
          />
        </Field>

        {isNew ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" htmlFor="login-name" error={fieldErrors.name}>
              <Input id="login-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Rohit Mehta" autoComplete="name" invalid={Boolean(fieldErrors.name)} />
            </Field>
            <Field label="Email" optionalLabel htmlFor="login-email" error={fieldErrors.email}>
              <Input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" invalid={Boolean(fieldErrors.email)} />
            </Field>
          </div>
        ) : null}
      </div>

      {error ? <p role="alert" className="mt-3.5 text-[12.5px] leading-relaxed text-bad">{error}</p> : null}

      <Button type="submit" variant="solid" size="lg" fullWidth loading={busy} className="mt-5">
        Verify and continue
      </Button>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 text-[12.5px]">
        <button type="button" onClick={() => { setPhase("mobile"); setError(null); }} className="text-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink">
          Use a different number
        </button>
        <button
          type="button"
          onClick={() => void requestCode("login")}
          disabled={cooldown > 0 || busy}
          className="inline-flex items-center gap-1.5 font-semibold text-brass-deep transition-colors hover:text-ink disabled:cursor-not-allowed disabled:text-muted"
        >
          <IconRefresh size={13} />
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Send a new code"}
        </button>
      </div>
    </form>
  );
}
