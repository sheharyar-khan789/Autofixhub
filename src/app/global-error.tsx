"use client";

/**
 * Last-resort boundary for errors in the root layout itself. It must render its own
 * <html>/<body>. Shows a user-safe message only, never error details.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-GB">
      <body style={{ margin: 0, minHeight: "100vh", background: "#111315", color: "#f5f5f2", fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center" }}>
        <main style={{ maxWidth: 480, padding: 24 }}>
          <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ color: "#a8adb1", margin: "0 0 16px" }}>AutoFixHub could not be loaded. Please try again in a moment.</p>
          <button type="button" onClick={reset} style={{ background: "#d71920", color: "#fff", border: 0, borderRadius: 4, padding: "10px 16px", fontWeight: 700, cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
