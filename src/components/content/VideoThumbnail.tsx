"use client";

import { useState } from "react";
import { youtubeThumbnail } from "@/lib/models";

/**
 * A video's thumbnail, filling the (positioned) frame it's placed in. The image is always
 * cropped to the frame with object-cover — never stretched — so any source size or ratio
 * stays sharp and proportional. YouTube's default (4:3, letterboxed) crops cleanly to both
 * 16:9 and, for Shorts, the 9:16 picture in its middle. A custom thumbnail that fails to
 * load falls back to YouTube's, and if that fails too the frame is left plain.
 */
export function VideoThumbnail({
  src,
  youtubeVideoId,
  className = "",
  eager = false,
}: {
  /** Custom thumbnail (uploaded, or a local preview); falls back to YouTube's when absent. */
  src?: string;
  youtubeVideoId?: string;
  className?: string;
  eager?: boolean;
}) {
  const fallback = youtubeVideoId ? youtubeThumbnail(youtubeVideoId) : undefined;
  const [failed, setFailed] = useState<string[]>([]);
  const current = [src, fallback].find((s): s is string => Boolean(s) && !failed.includes(s!));
  if (!current) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- thumbnails come from Firebase Storage, workshop content or YouTube, not a fixed set of domains
    <img
      src={current}
      alt=""
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed((f) => [...f, current])}
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
    />
  );
}
