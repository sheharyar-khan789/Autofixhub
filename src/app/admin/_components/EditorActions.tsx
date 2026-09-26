"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { PublishStatus } from "@/lib/models";
import { primaryBtn, secondaryBtn } from "./ui";

/**
 * Sticky editor action bar. The clicked button sends `intent` (draft | published),
 * which the server action reads as the new status (statusFromForm). Both buttons are
 * disabled while saving, so a slow save can't be double-submitted.
 */
export function EditorActions({ status, noun, message }: { status?: PublishStatus; noun: string; message?: React.ReactNode }) {
  const { pending } = useFormStatus();
  const [clicked, setClicked] = useState<"draft" | "published" | null>(null);
  const published = status === "published";
  const spinner = <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />;

  const secondary = published
    ? { intent: "draft" as const, label: "Unpublish", busy: "Unpublishing…" }
    : { intent: "draft" as const, label: status ? "Save draft" : "Save as draft", busy: "Saving…" };
  const primary = published
    ? { intent: "published" as const, label: "Save changes", busy: "Saving…" }
    : { intent: "published" as const, label: `Publish ${noun}`, busy: "Publishing…" };

  return (
    <div className="sticky bottom-0 z-20 -mx-gutter flex flex-col gap-space-sm border-t border-border-subtle bg-surface-base/95 px-gutter py-space-md backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="min-h-5 text-body-sm text-text-muted" aria-live="polite">
        {pending ? "Saving your changes…" : message ?? (published ? "This is live on the website." : "Drafts are never shown on the website.")}
      </div>
      <div className="flex gap-space-sm">
        {[secondary, primary].map((b, i) => (
          <button
            key={b.intent + i}
            type="submit"
            name="intent"
            value={b.intent}
            disabled={pending}
            onClick={() => setClicked(b.intent)}
            className={i === 0 ? secondaryBtn : primaryBtn}
          >
            {pending && clicked === b.intent && spinner}
            {pending && clicked === b.intent ? b.busy : b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
