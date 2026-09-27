import { ExternalLink, Play } from "lucide-react";
import Link from "next/link";
import { youtubeOpenUrl, type Video } from "@/lib/models";
import { VIDEO_FRAME } from "./videoFrame";
import { VideoThumbnail } from "./VideoThumbnail";
import { YouTubeVideoLink } from "./YouTubeVideoLink";

/**
 * Video card. The thumbnail opens the video on YouTube (videos are never played on this
 * site, so views count on the channel); the title opens the video's page here, with its
 * guide and fault codes. `featured` is the homepage's cinematic lead: a large thumbnail
 * with the title set over a dark gradient. Thumbnails are the real video thumbnails only.
 */
export function VideoCard({
  video,
  featured = false,
  alone = false,
}: {
  video: Video;
  featured?: boolean;
  /** Featured with no companions: an ultrawide 21:9 frame instead of a full-width 16:9 block. */
  alone?: boolean;
}) {
  const short = video.videoType === "short";
  if (featured) {
    return (
      <li className="lg:col-span-2 lg:row-span-2">
        <div className="card-lift group relative block h-full overflow-hidden rounded-lg border border-border-subtle bg-surface-container-lowest hover:border-border-medium">
          <span className={`relative block h-full min-h-full w-full ${alone ? "aspect-video md:aspect-[21/9]" : "aspect-video"}`}>
            <a
              href={youtubeOpenUrl(video.youtubeVideoId, video.videoType)}
              target="_blank"
              rel="noopener"
              aria-label={`Watch on YouTube: ${video.title} (opens YouTube in a new tab)`}
              className="absolute inset-0 block"
            >
              {short ? (
                // A Short keeps its own 9:16 frame, centred over a blurred copy that fills the wide tile.
                <>
                  <VideoThumbnail src={video.thumbnail} youtubeVideoId={video.youtubeVideoId} className="scale-110 opacity-50 blur-2xl" />
                  <span className={`absolute inset-y-0 left-1/2 block -translate-x-1/2 overflow-hidden ${VIDEO_FRAME.short}`}>
                    <VideoThumbnail
                      src={video.thumbnail}
                      youtubeVideoId={video.youtubeVideoId}
                      className="transition-transform duration-700 motion-safe:group-hover:scale-[1.03]"
                    />
                  </span>
                </>
              ) : (
                <VideoThumbnail
                  src={video.thumbnail}
                  youtubeVideoId={video.youtubeVideoId}
                  className="transition-transform duration-700 motion-safe:group-hover:scale-[1.03]"
                />
              )}
            </a>
            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgb(9_11_13/0.95),rgb(9_11_13/0.35)_45%,transparent_75%)]" />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-space-md p-space-md md:p-8">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-container transition-transform motion-safe:group-hover:scale-105 md:h-14 md:w-14">
                <Play className="h-5 w-5 translate-x-px" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col gap-space-xs">
                <span className="inline-flex items-center gap-space-xs font-code text-label-badge uppercase tracking-[0.16em] text-text-muted">
                  Latest video · Watch on YouTube <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </span>
                <Link
                  href={`/videos/${video.slug}`}
                  className="pointer-events-auto font-headline text-headline-sm text-text-primary hover:underline md:text-headline-md"
                >
                  {video.title}
                </Link>
                {video.description && (
                  <span className="hidden text-body-sm text-text-muted md:line-clamp-2">{video.description}</span>
                )}
              </span>
            </span>
          </span>
        </div>
      </li>
    );
  }
  return (
    <li className="card-lift flex h-full flex-col gap-space-sm rounded-lg border border-border-subtle bg-surface-raised p-space-sm hover:border-border-medium">
      <YouTubeVideoLink
        videoId={video.youtubeVideoId}
        title={video.title}
        videoType={video.videoType}
        thumbnail={video.thumbnail}
        size="card"
      />
      <Link href={`/videos/${video.slug}`} className="flex flex-col gap-space-xs px-space-xs pb-space-xs hover:[&>span:first-child]:underline">
        <span className="font-headline text-headline-sm text-text-primary">{video.title}</span>
        {video.description && <span className="line-clamp-2 text-body-sm text-text-muted">{video.description}</span>}
      </Link>
    </li>
  );
}
