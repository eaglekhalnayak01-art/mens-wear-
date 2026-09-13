"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { IconAlert, IconEye, IconEyeOff, IconLock } from "@/components/ui/icons";
import { api, ApiError } from "@/lib/client-api";

/**
 * Owner sign-in. Wrong credentials return one generic sentence — never "no such
 * email" — and the throttle is server-side, so the message tells the owner when to
 * come back rather than how many guesses are left.
 */
export function AdminLoginForm({ next = "/admin" }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFields({});
    if (!email.includes("@") || password.length < 6) {
      setFields({
        ...(email.includes("@") ? {} : { email: "Enter the owner email address." }),
        ...(password.length >= 6 ? {} : { password: "Passwords here are at least 10 characters — check for a typo." }),
      });
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/admin/auth/login", { email: email.trim(), password });
      const target = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
      router.replace(target);
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFields(caught.fields ?? {});
      } else {
        setError("We could not reach the dashboard. Check your connection and try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="admin-card p-5 sm:p-6" noValidate>
      <h2 className="text-[15px] font-semibold text-ink">Sign in</h2>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted">Staff and owner accounts only. This screen is not linked anywhere on the shop.</p>

      <div className="mt-5 space-y-4">
        <Field label="Email" required error={fields.email} htmlFor="ad-email">
          <Input id="ad-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} invalid={Boolean(fields.email)} placeholder="admin@aakashmenswear.in" />
        </Field>

        <Field label="Password" required error={fields.password} htmlFor="ad-password">
          <div className="relative">
            <Input
              id="ad-password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              invalid={Boolean(fields.password)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((value) => !value)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted transition-colors hover:bg-sand hover:text-ink"
            >
              {show ? <IconEyeOff size={15} /> : <IconEye size={15} />}
            </button>
          </div>
        </Field>
      </div>

      {error ? (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-[var(--radius-sm)] border border-bad/25 bg-bad-tint px-3 py-2.5 text-[12.5px] leading-relaxed text-bad">
          <IconAlert size={14} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="solid" size="lg" fullWidth loading={busy} className="mt-5" iconLeft={<IconLock size={14} />}>
        Enter dashboard
      </Button>
    </form>
  );
}
