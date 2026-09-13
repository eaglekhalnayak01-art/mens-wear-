"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconAlert, IconCheck, IconWhatsapp } from "@/components/ui/icons";
import { api, ApiError } from "@/lib/client-api";

export type AlertConfig = {
  mobile: string;
  email: string;
  webhookUrl: string;
  enabled: boolean;
  whatsappEnabled: boolean;
};

type TestResult = {
  ok: boolean;
  enabled: boolean;
  mobile: string | null;
  email: string | null;
  webhookUrl: string | null;
  webhookOk: boolean | null;
  whatsappLink: string | null;
};

/**
 * Sits next to the security card because it answers the question the owner actually
 * has: “will I *really* know when an order comes?” — one press proves it.
 */
export function AlertTester({ config }: { config: AlertConfig }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await api.post<TestResult>("/api/admin/notifications/test"));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "We could not reach the shop.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-card p-4" aria-labelledby="alert-test-title">
      <h2 id="alert-test-title" className="admin-section-title">
        Order alerts
      </h2>
      <ul className="mt-2.5 space-y-1 text-[11.5px] leading-relaxed text-graphite">
        <li className="flex items-baseline justify-between gap-2">
          <span className="text-muted">Alerts switched on</span>
          <span className={config.enabled ? "font-medium text-good" : "font-medium text-bad"}>{config.enabled ? "Yes" : "No"}</span>
        </li>
        <li className="flex items-baseline justify-between gap-2">
          <span className="text-muted">Your number</span>
          <span className={config.mobile ? "nums font-medium text-ink" : "text-bad"}>{config.mobile || "not set"}</span>
        </li>
        <li className="flex items-baseline justify-between gap-2">
          <span className="text-muted">Webhook</span>
          <span className={config.webhookUrl ? "text-ink" : "text-muted"}>{config.webhookUrl ? "set" : "none"}</span>
        </li>
      </ul>

      <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">
        Every order is written to this dashboard first, so nothing is lost. This button sends yourself one test alert through the same route.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="light" size="sm" loading={busy} onClick={() => void send()}>
          Send a test alert
        </Button>
        {result?.whatsappLink ? (
          <a
            href={result.whatsappLink}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-good-tint px-3 text-[11.5px] font-medium text-good transition-opacity hover:opacity-85"
          >
            <IconWhatsapp size={13} /> Open it on WhatsApp
          </a>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-2.5 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-bad">
          <IconAlert size={13} className="mt-0.5 shrink-0" /> {error}
        </p>
      ) : null}

      {result ? (
        <p className="mt-2.5 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-graphite">
          <IconCheck size={13} className="mt-0.5 shrink-0 text-good" />
          <span>
            Test written to the bell{result.mobile ? ` and prepared for ${result.mobile}` : ""}.
            {result.webhookUrl
              ? result.webhookOk
                ? " Your webhook accepted it."
                : " Your webhook did not answer — check that URL."
              : " No webhook is set, so only the dashboard and WhatsApp link are used."}
          </span>
        </p>
      ) : null}

      {!config.mobile ? (
        <p className="mt-2.5 rounded-[var(--radius-sm)] bg-warn-tint px-2.5 py-2 text-[11.5px] leading-relaxed text-warn">
          Add your mobile number in Settings → Order alerts to get the one-tap WhatsApp alert.
        </p>
      ) : null}
    </section>
  );
}
