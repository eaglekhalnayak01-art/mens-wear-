"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconAlert, IconRefresh } from "@/components/ui/icons";

/**
 * Route-level error boundary. The message is written for a customer, not a log:
 * what happened, that nothing is lost, and two ways out. The real error goes to the
 * console (and to whatever error service is wired up later), never onto the screen.
 */
export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[shop:error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-[620px] flex-col items-start px-4 py-20 sm:px-6">
      <span className="inline-flex items-center gap-2 rounded-full bg-bad-tint px-3 py-1 text-[11.5px] font-medium text-bad">
        <IconAlert size={13} /> Something went wrong on this page
      </span>
      <h1 className="mt-4 font-display text-[28px] leading-tight text-ink sm:text-[34px]">The shop did not finish loading</h1>
      <p className="mt-3 text-[14.5px] leading-relaxed text-graphite">
        A basket is never lost in a bad render, and an order already placed is safe — it is on our side and can be tracked. Try again, or pick up where you left
        off.
      </p>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Button onClick={reset} variant="solid" size="md" iconLeft={<IconRefresh size={15} />}>
          Try again
        </Button>
        <Link href="/shop">
          <Button variant="outline" size="md">
            Back to the shop
          </Button>
        </Link>
        <Link href="/cart" className="link-line ml-1 text-[13.5px]">
          Open my cart
        </Link>
      </div>
      {process.env.NODE_ENV !== "production" && error.message ? (
        <p className="mt-8 w-full overflow-x-auto rounded-[var(--radius-sm)] bg-sand px-3 py-2.5 font-mono text-[11px] leading-relaxed text-muted">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}
