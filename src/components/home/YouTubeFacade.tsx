"use client";
import { Play } from "lucide-react";
import { useState } from "react";
import type { VideoType } from "@/lib/models";
import { VIDEO_FRAME } from "@/components/content/videoFrame";
import { VideoThumbnail } from "@/components/content/VideoThumbnail";

/**
 * Click-to-load embed on youtube-nocookie.com: nothing from YouTube loads until the visitor
 * asks. A Short plays in a 9:16 frame. `poster` is the workshop's own custom thumbnail; the
 * YouTube thumbnail is deliberately not used here, for the same reason.
 */
export function YouTubeFacade({
  videoId,
  title,
  videoType = "standard",
  poster,
}: {
  videoId: string;
  title: string;
  videoType?: VideoType;
  poster?: string;
}) {
  const [active, setActive] = useState(false);
  return (
    <div
      data-video-frame={videoType}
      className={`relative overflow-hidden rounded border border-border-subtle bg-surface-card ${VIDEO_FRAME[videoType]} ${videoType === "short" ? "mx-auto w-full max-w-sm" : ""}`}
    >
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
        <>
          {poster && <VideoThumbnail src={poster} className="opacity-60" eager />}
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
        </>
      )}
    </div>
  );
}
