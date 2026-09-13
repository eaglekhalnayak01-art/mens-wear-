"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { IconCheck, IconMail, IconPhone, IconWhatsapp } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type EnquiryItem = {
  id: number;
  name: string;
  mobile: string;
  email: string | null;
  topic: string;
  message: string;
  status: string;
  createdAt: string;
};

/**
 * The messages the contact form sends. Replying happens off this screen — by phone
 * or WhatsApp, which is how the shop actually answers — so the dashboard only has
 * to keep track of what is still waiting.
 */
export function EnquiryInbox({ enquiries, whatsappEnabled }: { enquiries: EnquiryItem[]; whatsappEnabled: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);

  const mark = async (entry: EnquiryItem, status: "new" | "replied" | "closed") => {
    setBusyId(entry.id);
    try {
      await api.patch("/api/admin/enquiries", { id: entry.id, status });
      startTransition(() => router.refresh());
      toast.push({ title: status === "closed" ? "Archived" : `Marked ${status}`, tone: "good" });
    } catch (caught) {
      toast.push({ title: "Not saved", description: caught instanceof ApiError ? caught.message : "Network problem.", tone: "bad" });
    } finally {
      setBusyId(null);
    }
  };

  if (enquiries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-line px-6 py-14 text-center">
        <p className="text-[15px] font-medium text-ink">Inbox clear</p>
        <p className="max-w-[44ch] text-[12.5px] leading-relaxed text-muted">
          Nothing waiting on this filter. Messages from the contact page land here the moment someone sends one.
        </p>
      </div>
    );
  }

  return (
    <ul className={cn("space-y-3", pending && "opacity-70")}>
      {enquiries.map((entry) => {
        const digits = entry.mobile.replace(/\D/g, "").slice(-10);
        return (
          <li key={entry.id} className="admin-card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink">
                  {entry.name}
                  <span className="rounded-full bg-sand px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted">{entry.topic}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                      entry.status === "new" ? "bg-brass/14 text-ink" : entry.status === "replied" ? "bg-good-tint text-good" : "bg-line/60 text-muted",
                    )}
                  >
                    {entry.status}
                  </span>
                </p>
                <p className="nums mt-1 text-[11.5px] text-muted">{formatDateTime(entry.createdAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <a href={`tel:${entry.mobile}`} className="admin-chip h-8 px-2.5 text-[11.5px]">
                  <IconPhone size={12} /> {entry.mobile}
                </a>
                {whatsappEnabled && digits.length === 10 ? (
                  <a
                    href={`https://wa.me/91${digits}?text=${encodeURIComponent(`Hello ${entry.name}, regarding your message to us about "${entry.topic}".`)}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="admin-chip h-8 px-2.5 text-[11.5px] text-good"
                  >
                    <IconWhatsapp size={12} /> Reply
                  </a>
                ) : null}
                {entry.email ? (
                  <a href={`mailto:${entry.email}`} className="admin-chip h-8 px-2.5 text-[11.5px]">
                    <IconMail size={12} /> Email
                  </a>
                ) : null}
              </div>
            </div>

            <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-graphite">{entry.message}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
              {entry.status !== "replied" ? (
                <button type="button" disabled={busyId === entry.id} onClick={() => void mark(entry, "replied")} className="admin-chip h-8 px-3 text-[12px]">
                  <IconCheck size={12} /> Mark replied
                </button>
              ) : null}
              {entry.status !== "closed" ? (
                <button type="button" disabled={busyId === entry.id} onClick={() => void mark(entry, "closed")} className="text-[12px] text-muted underline decoration-line underline-offset-4 hover:text-ink">
                  Archive
                </button>
              ) : (
                <button type="button" disabled={busyId === entry.id} onClick={() => void mark(entry, "new")} className="text-[12px] text-muted underline decoration-line underline-offset-4 hover:text-ink">
                  Re-open
                </button>
              )}
              <Link href={`/admin/orders?q=${encodeURIComponent(entry.mobile)}`} className="ml-auto text-[11.5px] text-muted underline decoration-line underline-offset-4 hover:text-ink">
                Search their orders
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
