import type { VideoType } from "@/lib/models";

/**
 * Frame shape per video type: 16:9 for standard videos, 9:16 for Shorts. A plain module (not
 * "use client") so server components get the real class names, not a client reference.
 */
export const VIDEO_FRAME: Record<VideoType, string> = {
  standard: "aspect-video",
  short: "aspect-[9/16]",
};
