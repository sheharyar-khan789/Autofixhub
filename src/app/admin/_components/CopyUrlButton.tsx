"use client";

import { useState } from "react";

/** Copies a public URL (e.g. for a YouTube video description). Falls back to showing the URL to copy by hand. */
export function CopyUrlButton({ url, label = "Copy URL" }: { url: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <span className="inline-flex flex-wrap items-center gap-space-xs">
      <button
        type="button"
        className="inline-flex min-h-9 items-center rounded px-space-sm text-body-sm font-semibold text-text-muted transition-colors hover:bg-surface-card hover:text-text-primary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setState("copied");
          } catch {
            // Clipboard can be blocked (permissions, insecure context): show the URL instead.
            setState("failed");
          }
        }}
      >
        {state === "copied" ? "Copied" : label}
      </button>
      {state === "failed" && <code className="select-all font-code text-label-code text-text-primary">{url}</code>}
      <span className="sr-only" aria-live="polite">
        {state === "copied" ? "URL copied to clipboard" : ""}
      </span>
    </span>
  );
}
