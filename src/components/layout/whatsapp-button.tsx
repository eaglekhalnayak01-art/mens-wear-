"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { IconWhatsapp } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * One-tap WhatsApp contact. Deliberately small and out of the way — it appears
 * after the visitor has scrolled a little, never covers the primary action, and
 * disappears during checkout where it would only distract.
 */
export function WhatsappButton({ href, label }: { href: string | null; label: string }) {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!href) return null;
  if (pathname.startsWith("/checkout") || pathname.startsWith("/admin")) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Message the shop on WhatsApp"
      className={cn(
        "group fixed bottom-[84px] right-4 z-40 inline-flex items-center gap-2 rounded-full border border-good/25 bg-paper/95 py-2 pl-2.5 pr-3 text-[12.5px] font-medium text-ink shadow-card backdrop-blur transition-[opacity,transform] duration-300 ease-[cubic-bezier(.22,.61,.36,1)] hover:shadow-lift sm:bottom-6 sm:right-6",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#25D366]/15 text-[#128C4A]">
        <IconWhatsapp size={16} />
      </span>
      <span className="hidden max-w-0 overflow-hidden whitespace-nowrap transition-[max-width] duration-300 group-hover:max-w-[180px] sm:inline">
        {label}
      </span>
    </a>
  );
}
