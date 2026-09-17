"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconBell } from "@/components/ui/icons";
import { api } from "@/lib/client-api";
import { cn } from "@/lib/cn";

type Alert = {
  id: number;
  event: string;
  title: string;
  body: string;
  orderRef: string | null;
  orderId: number | null;
  readAt: string | null;
  createdAt: string;
};

const POLL_MS = 45_000;
const DESKTOP_KEY = "amw.admin.desktop-alerts";

function when(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * The owner's bell. It polls a deliberately tiny endpoint while the tab is open, so
 * "an order came in while I was packing" is visible without a push service, and the
 * same rows are the permanent record even when the laptop was closed.
 */
export function AdminAlerts() {
  const [items, setItems] = useState<Alert[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const highest = useRef(0);
  const wrap = useRef<HTMLDivElement>(null);

  const poll = useCallback(async () => {
    try {
      const data = await api.get<{ items: Alert[]; unread: number }>(`/api/admin/notifications?limit=12`);
      setItems(data.items);
      setUnread(data.unread);
      const top = data.items[0]?.id ?? 0;
      // Only announce genuinely new rows, and only orders — never on first paint.
      if (highest.current && top > highest.current) {
        const fresh = data.items.filter((item) => item.id > highest.current && item.event.startsWith("order:"));
        if (fresh.length > 0 && typeof Notification !== "undefined" && Notification.permission === "granted") {
          for (const entry of fresh.slice(0, 3)) {
            new Notification(entry.title, { body: entry.body, tag: `amw-${entry.id}` });
          }
        }
      }
      highest.current = top;
    } catch {
      /* a dropped poll is not worth a toast; the next tick catches up */
    }
  }, []);

  useEffect(() => {
    void poll();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [poll]);

  useEffect(() => {
    try {
      setDesktop(window.localStorage.getItem(DESKTOP_KEY) === "on" && typeof Notification !== "undefined" && Notification.permission === "granted");
    } catch {
      /* private mode */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const show = async () => {
    setOpen((current) => !current);
    if (!open && unread > 0) {
      setUnread(0);
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
      await api.post("/api/admin/notifications", {}).catch(() => undefined);
    }
  };

  const askDesktop = async () => {
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission();
    const on = permission === "granted";
    setDesktop(on);
    try {
      window.localStorage.setItem(DESKTOP_KEY, on ? "on" : "off");
    } catch {
      /* non-essential */
    }
    if (on) new Notification("Alerts are on", { body: `${items.length ? "Latest: " + items[0].title : "We will ring when a new order arrives."}` });
  };

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => void show()}
        aria-expanded={open}
        aria-label={unread > 0 ? `Alerts — ${unread} unread` : "Alerts"}
        className={cn(
          "relative flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-[12.5px] transition-colors",
          open ? "bg-sand text-ink" : "text-muted hover:bg-sand hover:text-ink",
        )}
      >
        <span className="relative">
          <IconBell size={16} />
          {unread > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 grid h-[14px] min-w-[14px] place-items-center rounded-full bg-brass px-[3px] text-[9px] font-semibold text-bone">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </span>
        <span className="hidden lg:inline">Alerts</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-[min(92vw,340px)] overflow-hidden rounded-[var(--radius-md)] border border-line bg-paper shadow-[0_18px_50px_-24px_rgba(28,26,23,0.45)]">
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">Shop alerts</p>
            <button type="button" onClick={() => void askDesktop()} className={cn("text-[11px] underline-offset-2 hover:underline", desktop ? "text-good" : "text-muted hover:text-ink")}>
              {desktop ? "Browser alerts on" : "Turn on browser alerts"}
            </button>
          </div>

          {items.length === 0 ? (
            <p className="px-3 py-5 text-[12.5px] leading-relaxed text-muted">
              Nothing yet. When a customer places an order it lands here — and on the mobile number in Settings → Order alerts.
            </p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className={cn("px-3 py-2.5", !item.readAt && "bg-brass-tint/40")}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[12.5px] font-semibold text-ink">{item.title}</p>
                    <span className="shrink-0 text-[10.5px] text-muted">{when(item.createdAt)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-[11.5px] leading-relaxed text-graphite">{item.body}</p>
                  {item.orderId ? (
                    <Link
                      href={`/admin/orders/${item.orderId}`}
                      onClick={() => setOpen(false)}
                      className="mt-1.5 inline-block text-[11.5px] font-medium text-brass-deep underline decoration-brass/40 underline-offset-2 hover:text-brass"
                    >
                      Open {item.orderRef}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-line px-3 py-2 text-[11px] text-muted">
            Kept in the shop database, so a closed laptop loses nothing.
          </div>
        </div>
      ) : null}
    </div>
  );
}
