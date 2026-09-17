"use client";

/**
 * Last line of defence: a failure so early that the root layout itself did not
 * render. It has to draw its own <html>, and it stays deliberately plain — no
 * fonts, no providers, nothing that could fail the same way twice.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ margin: 0, background: "#fdf7ec", color: "#1c1a17", fontFamily: "ui-sans-serif, system-ui, sans-serif", padding: "18vh 20px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8a857c", margin: 0 }}>Mens Wear</p>
          <h1 style={{ fontSize: 28, lineHeight: 1.15, margin: "14px 0 0", fontWeight: 600 }}>The page could not start</h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "#3f4145", margin: "12px 0 0" }}>
            Nothing you ordered is affected. Reload the shop, or come back in a minute.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 22, height: 42, padding: "0 20px", borderRadius: 999, border: "none", background: "#1c1a17", color: "#fdf7ec", fontSize: 14, cursor: "pointer" }}
          >
            Reload the shop
          </button>
          <p style={{ marginTop: 26, fontSize: 11, color: "#9a978f" }}>
            Reference {error?.digest?.slice(0, 12) ?? "n/a"}
            {error?.digest ? " — quote this if you write to us." : "."}
          </p>
        </div>
      </body>
    </html>
  );
}
