"use client";

import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/** Messages for `?notice=` keys set by server actions after a redirect (never raw error text). */
const NOTICES: Record<string, { tone: "success" | "error" | "info"; text: string }> = {
  saved: { tone: "success", text: "Changes saved." },
  created: { tone: "success", text: "Created as a draft." },
  published: { tone: "success", text: "Published. It is now live on the website." },
  unpublished: { tone: "info", text: "Unpublished. It is no longer visible on the website." },
  deleted: { tone: "success", text: "Deleted." },
  forbidden: { tone: "error", text: "Your account doesn't have access to that area." },
  "action-failed": { tone: "error", text: "That action couldn't be completed. Nothing was changed. Try again." },
};

const ICON = { success: CheckCircle2, error: TriangleAlert, info: Info } as const;
const TONE = {
  success: "border-status-pass-green/50 text-status-pass-green",
  error: "border-status-fault-red/60 text-status-fault-red",
  info: "border-border-medium text-text-muted",
} as const;

export function FlashToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const key = params.get("notice");
  const notice = key ? NOTICES[key] : undefined;
  const [visible, setVisible] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string | null>(null);
  // Derived state: capture a new notice during render (no setState-in-effect cascade).
  if (key !== lastKey) {
    setLastKey(key);
    if (key && notice) setVisible(key);
  }

  useEffect(() => {
    if (!key) return;
    // Remove the notice from the URL so a refresh doesn't repeat it.
    const rest = new URLSearchParams(params);
    rest.delete("notice");
    const q = rest.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [key, params, pathname, router]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(null), 6000);
    return () => clearTimeout(t);
  }, [visible]);

  const shown = visible ? NOTICES[visible] : undefined;
  if (!shown) return null;
  const Icon = ICON[shown.tone];
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-space-lg z-[60] flex justify-center px-gutter" aria-live="polite">
      <div role={shown.tone === "error" ? "alert" : "status"} className={`pointer-events-auto flex max-w-md items-start gap-space-sm rounded-lg border bg-surface-card px-space-md py-space-sm shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)] ${TONE[shown.tone]}`}>
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p className="text-body-sm text-text-primary">{shown.text}</p>
        <button type="button" aria-label="Dismiss" onClick={() => setVisible(null)} className="-mr-1 rounded p-1 text-text-muted hover:text-text-primary">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
