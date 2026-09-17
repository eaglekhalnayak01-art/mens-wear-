"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Who is signed in (if anyone). Browsing never requires an account — this only
 * decorates the account menu and lets checkout prefill.
 */
export type SessionCustomer = { id: number; name: string | null; mobile: string; email: string | null };

type SessionCtx = {
  customer: SessionCustomer | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionCtx | null>(null);

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) return { customer: null, loading: false, refresh: async () => {}, signOut: async () => {} };
  return ctx;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<SessionCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/store/session", { credentials: "same-origin", cache: "no-store" });
      if (!res.ok) {
        setCustomer(null);
        return;
      }
      const data = await res.json();
      setCustomer(data?.customer ?? null);
    } catch {
      /* network hiccup: keep whatever identity we had */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await fetch("/api/store/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => null);
    setCustomer(null);
    router.refresh();
  }, [router]);

  const value = useMemo(() => ({ customer, loading, refresh, signOut }), [customer, loading, refresh, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
