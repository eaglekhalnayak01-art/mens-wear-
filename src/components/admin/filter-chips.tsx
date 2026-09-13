"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

type Group = {
  key: string;
  label: string;
  current?: string;
  options: { value: string; label: string }[];
};

/**
 * One-tap filters. They are links, not state, so the browser back button and a
 * shared URL both behave — a shop owner sending "look at these" to staff on
 * WhatsApp gets a working link.
 */
export function FilterChips({ basePath, groups }: { basePath: string; groups: Group[] }) {
  const params = useSearchParams();
  const current = new URLSearchParams(params.toString());

  const hrefFor = (key: string, value: string) => {
    const next = new URLSearchParams(current);
    if (value === "all" || value === "") next.delete(key);
    else next.set(key, value);
    next.delete("page");
    const qs = next.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {groups.map((group) => (
        <div key={group.key} className="flex items-center gap-1.5" role="group" aria-label={group.label}>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">{group.label}</span>
          {group.options.map((option) => {
            const active = (group.current ?? "all") === option.value;
            return (
              <Link
                key={option.value}
                href={hrefFor(group.key, option.value)}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={cn("admin-chip", active && "border-ink bg-ink text-bone")}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
