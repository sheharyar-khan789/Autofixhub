import { ExternalLink, Play } from "lucide-react";
import { youtubeOpenUrl, type VideoType } from "@/lib/models";
import { VIDEO_FRAME } from "./videoFrame";
import { VideoThumbnail } from "./VideoThumbnail";

/**
 * A video on this site is its thumbnail linking straight to YouTube (new tab; the YouTube
 * app on phones). Videos are never played here, so every view counts on the channel, and
 * nothing from YouTube but the thumbnail image loads on this site. 16:9, or 9:16 for Shorts.
 */
export function YouTubeVideoLink({
  videoId,
  title,
  videoType = "standard",
  thumbnail,
  size = "large",
}: {
  videoId: string;
  title: string;
  videoType?: VideoType;
  /** The video's custom thumbnail; YouTube's is used without one. */
  thumbnail?: string;
  /** "large" on content pages, "card" inside video cards. */
  size?: "large" | "card";
}) {
  const short = videoType === "short";
  const large = size === "large";
  return (
    <a
      href={youtubeOpenUrl(videoId, videoType)}
      target="_blank"
      rel="noopener"
      aria-label={`Watch on YouTube: ${title} (opens YouTube in a new tab)`}
      data-video-frame={videoType}
      className={`group/video relative block overflow-hidden rounded bg-surface-card ${VIDEO_FRAME[videoType]} ${
        large ? "border border-border-subtle" : ""
      } ${short ? `mx-auto w-full ${large ? "max-w-sm" : "max-w-[18rem]"}` : ""}`}
    >
      <VideoThumbnail
        src={thumbnail}
        youtubeVideoId={videoId}
        className="transition-transform duration-500 motion-safe:group-hover/video:scale-[1.04]"
      />
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-space-sm bg-black/25 transition-colors group-hover/video:bg-black/10">
        <span
          className={`flex items-center justify-center rounded-full bg-primary-container shadow-lg ${large ? "h-16 w-16" : "h-10 w-10"}`}
        >
          <Play className={`translate-x-px ${large ? "h-7 w-7" : "h-5 w-5"}`} aria-hidden="true" />
        </span>
        {large && (
          <span className="inline-flex items-center gap-space-xs rounded bg-black/60 px-space-sm py-1 font-code text-label-code text-text-primary">
            Watch on YouTube <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </span>
    </a>
  );
}
