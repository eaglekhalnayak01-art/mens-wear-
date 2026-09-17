"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/account/session-provider";
import { IconLogout } from "@/components/ui/icons";

/** The provider owns the logout call (cookie revoked server-side, not just cleared). */
export function SignOutButton({ redirectTo = "/" }: { redirectTo?: string }) {
  const router = useRouter();
  const { signOut } = useSession();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await signOut();
        router.push(redirectTo);
        setBusy(false);
      }}
      className="inline-flex items-center gap-1.5 text-[12.5px] text-muted transition-colors hover:text-ink disabled:opacity-50"
    >
      <IconLogout size={14} /> {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
