"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { IconAlert, IconCheck, IconLock } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/client-api";
import { cn } from "@/lib/cn";

export type SecurityState = {
  email: string;
  failedAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  sessions: number;
};

/**
 * The one thing standing between the whole shop and a stranger. Deliberately on this
 * page rather than its own: there is exactly one account, and its owner should see the
 * lock state while they are editing the shop.
 */
export function SecurityPanel({ state }: { state: SecurityState }) {
  const router = useRouter();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = Boolean(state.lockedUntil && new Date(state.lockedUntil).getTime() > Date.now());

  const change = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError("The two new entries are not the same.");
      return;
    }
    if (next.length < 12) {
      setError("Use at least 12 characters. A short sentence you can remember is best.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/admin/auth/password", { currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.push({
        title: "Password changed",
        description: "You are signed out everywhere — including this window. Sign in again with the new one.",
        tone: "good",
      });
      window.setTimeout(() => router.push("/admin/login"), 1400);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "We could not reach the shop. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  };

  const act = async (kind: "sessions" | "unlock", label: string) => {
    setBusy(true);
    setError(null);
    try {
      const result =
        kind === "sessions"
          ? await api.del<{ message?: string }>("/api/admin/auth/sessions")
          : await api.post<{ ok: boolean }>("/api/admin/auth/unlock");
      toast.push({ title: label, description: (result && "message" in result && result.message) || "Done.", tone: "good" });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "That did not go through. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-card p-4" aria-labelledby="security-title">
      <h2 id="security-title" className="admin-section-title flex items-center gap-1.5">
        <IconLock size={13} /> Security
      </h2>
      <ul className="mt-3 space-y-1.5 text-[11.5px] leading-relaxed text-graphite">
        <li className="flex items-baseline justify-between gap-2">
          <span className="text-muted">Signed in as</span>
          <span className="truncate font-medium text-ink">{state.email}</span>
        </li>
        <li className="flex items-baseline justify-between gap-2">
          <span className="text-muted">Last sign-in</span>
          <span>{state.lastLoginAt ? new Date(state.lastLoginAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "This is the first"}</span>
        </li>
        <li className="flex items-baseline justify-between gap-2">
          <span className="text-muted">Open sessions</span>
          <span>{state.sessions}</span>
        </li>
        <li className="flex items-baseline justify-between gap-2">
          <span className="text-muted">Wrong passwords since last success</span>
          <span className={cn(state.failedAttempts > 0 ? "font-semibold text-bad" : "")}>{state.failedAttempts}</span>
        </li>
      </ul>

      {locked ? (
        <p className="mt-3 flex items-start gap-1.5 rounded-[var(--radius-sm)] bg-bad-tint px-2.5 py-2 text-[11.5px] leading-relaxed text-bad">
          <IconAlert size={13} className="mt-0.5 shrink-0" /> This account is paused after too many wrong attempts. Wait it out, or clear the pause below.
        </p>
      ) : null}

      <form onSubmit={change} className="mt-4 space-y-2.5 border-t border-line pt-4" noValidate>
        <p className="text-[12px] font-medium text-ink">Change the password</p>
        <Input type="password" value={current} onChange={(event) => setCurrent(event.target.value)} placeholder="Current password" autoComplete="current-password" />
        <Input type="password" value={next} onChange={(event) => setNext(event.target.value)} placeholder="New password (12+ characters)" autoComplete="new-password" />
        <Input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Type the new password again" autoComplete="new-password" />
        {error ? (
          <p role="alert" className="text-[11.5px] leading-snug text-bad">
            {error}
          </p>
        ) : (
          <p className="text-[11px] leading-snug text-muted">Changing it signs this dashboard out on every device, then back in here only after you re-enter it.</p>
        )}
        <Button type="submit" variant="solid" size="md" loading={busy} disabled={!current || !next}>
          Change password
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => act("sessions", "Signed out elsewhere")}
          className="inline-flex h-8 items-center rounded-full border border-line px-3 text-[11.5px] font-medium text-graphite transition-colors hover:border-ink hover:text-ink"
        >
          Sign out every other device
        </button>
        {state.failedAttempts > 0 || locked ? (
          <button
            type="button"
            onClick={() => act("unlock", "Login unlocked")}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[11.5px] font-medium text-graphite transition-colors hover:border-ink hover:text-ink"
          >
            <IconCheck size={12} /> Clear the wrong-attempt pause
          </button>
        ) : null}
      </div>
    </section>
  );
}
