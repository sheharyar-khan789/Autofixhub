"use client";
import { Play } from "lucide-react";
import { useState } from "react";

/** Click-to-load embed on youtube-nocookie.com: nothing third-party loads until the visitor asks. */
export function YouTubeFacade({ videoId, title }: { videoId: string; title: string }) {
  const [active, setActive] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded border border-border-subtle bg-surface-card">
      {active ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-space-sm text-text-primary"
          aria-label={`Play video: ${title}`}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-container">
            <Play className="h-7 w-7" aria-hidden="true" />
          </span>
          <span className="font-code text-label-code">{title}</span>
          <span className="font-code text-label-telemetry text-text-muted">Loads from YouTube when played</span>
        </button>
      )}
    </div>
  );
}
