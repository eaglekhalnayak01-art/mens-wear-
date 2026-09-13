"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";

/**
 * The cart.
 *
 * A guest's cart lives in localStorage (no account needed to shop). What is
 * *trusted* never lives there: only `{variantId, qty}` is sent to the server,
 * and prices, stock and totals come back from `/api/store/cart/quote`. So the
 * drawer is instant, and a price that changed while the tab was open gets
 * corrected on the next request instead of being charged wrong.
 */
export type CartItem = {
  variantId: number;
  productId: number;
  name: string;
  slug: string;
  size: string | null;
  color: string | null;
  unitPrice: number;
  compareAtPrice: number | null;
  image: string;
  sku: string | null;
  qty: number;
  availableStock?: number;
};

export type QuoteTotals = {
  subtotal: number;
  discount: number;
  shipping: number;
  codFee: number;
  total: number;
  itemCount: number;
  freeShippingGap: number;
  minOrderShortfall: number;
  notices: string[];
};

const STORAGE_KEY = "amw.cart.v1";
const MAX_QTY = 10;

type CartCtx = {
  items: CartItem[];
  count: number;
  totals: QuoteTotals;
  ready: boolean;
  syncing: boolean;
  open: boolean;
  bump: boolean;
  setOpen: (open: boolean) => void;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (variantId: number, qty: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
  revalidate: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const EMPTY_TOTALS: QuoteTotals = {
  subtotal: 0,
  discount: 0,
  shipping: 0,
  codFee: 0,
  total: 0,
  itemCount: 0,
  freeShippingGap: 0,
  minOrderShortfall: 0,
  notices: [],
};

function readStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry.variantId === "number" && typeof entry.qty === "number")
      .map((entry) => ({ ...entry, qty: Math.min(MAX_QTY, Math.max(1, Math.trunc(entry.qty))) }));
  } catch {
    return [];
  }
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(false);
  const [totals, setTotals] = useState<QuoteTotals>(EMPTY_TOTALS);
  const toast = useToast();
  const hydrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from storage on the client only (keeps SSR markup stable).
  useEffect(() => {
    setItems(readStorage());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* private mode / quota — the cart still works for this visit */
    }
  }, [items, ready]);

  const revalidate = useCallback(async () => {
    if (items.length === 0) {
      setTotals(EMPTY_TOTALS);
      return;
    }
    setSyncing(true);
    try {
      const payload = await fetch("/api/store/cart/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ items: items.map((item) => ({ variantId: item.variantId, qty: item.qty })) }),
      }).then((res) => (res.ok ? res.json() : null));

      if (!payload) return;
      setTotals({
        subtotal: payload.subtotal,
        discount: payload.discount,
        shipping: payload.shipping,
        codFee: payload.codFee,
        total: payload.total,
        itemCount: payload.itemCount,
        freeShippingGap: payload.freeShippingGap,
        minOrderShortfall: payload.minOrderShortfall,
        notices: payload.notices ?? [],
      });

      // Server wins on price and availability.
      const byVariant = new Map<number, any>(payload.lines.map((line: any) => [line.variantId, line]));
      setItems((list) => {
        const next = list
          .filter((item) => byVariant.has(item.variantId))
          .map((item) => {
            const line = byVariant.get(item.variantId);
            return {
              ...item,
              qty: line.qty,
              unitPrice: line.unitPrice,
              compareAtPrice: line.compareAtPrice,
              availableStock: line.availableStock,
              name: line.name,
              image: line.image?.src ?? item.image,
            };
          });
        return next;
      });
    } catch {
      /* offline: keep the cached cart, checkout will revalidate */
    } finally {
      setSyncing(false);
    }
  }, [items]);

  // Debounced refresh after each change; also on tab focus and drawer open.
  useEffect(() => {
    if (!ready) return;
    if (hydrateTimer.current) clearTimeout(hydrateTimer.current);
    hydrateTimer.current = setTimeout(() => void revalidate(), items.length ? 550 : 0);
    return () => {
      if (hydrateTimer.current) clearTimeout(hydrateTimer.current);
    };
  }, [items.length, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready || open) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void revalidate();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [ready, open, revalidate]);

  const add = useCallback<CartCtx["add"]>(
    (item, qty = 1) => {
      setItems((list) => {
        const existing = list.find((entry) => entry.variantId === item.variantId);
        if (existing) {
          const next = Math.min(MAX_QTY, existing.qty + qty);
          if (next === existing.qty) return list;
          return list.map((entry) => (entry.variantId === item.variantId ? { ...entry, qty: next } : entry));
        }
        return [...list, { ...item, qty: Math.min(MAX_QTY, Math.max(1, qty)) }];
      });
      setOpen(true);
      setBump(true);
      setTimeout(() => setBump(false), 450);
    },
    [],
  );

  const setQty = useCallback((variantId: number, qty: number) => {
    setItems((list) => {
      if (qty <= 0) return list.filter((item) => item.variantId !== variantId);
      return list.map((item) => (item.variantId === variantId ? { ...item, qty: Math.min(MAX_QTY, qty) } : item));
    });
  }, []);

  const remove = useCallback(
    (variantId: number) => {
      setItems((list) => list.filter((item) => item.variantId !== variantId));
      toast.push({ title: "Removed from cart", tone: "info" });
    },
    [toast],
  );

  const clear = useCallback(() => {
    setItems([]);
    setTotals(EMPTY_TOTALS);
  }, []);

  const value = useMemo<CartCtx>(() => {
    const count = items.reduce((sum, item) => sum + item.qty, 0);
    const localSubtotal = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
    return {
      items,
      count,
      // Show server totals when we have them; fall back to local maths pre-hydration.
      totals: ready && totals.itemCount > 0 ? totals : { ...totals, subtotal: totals.subtotal || localSubtotal, itemCount: totals.itemCount || count },
      ready,
      syncing,
      open,
      bump,
      setOpen,
      add,
      setQty,
      remove,
      clear,
      revalidate: () => void revalidate(),
    };
  }, [items, ready, syncing, open, bump, totals, add, setQty, remove, clear, revalidate]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
