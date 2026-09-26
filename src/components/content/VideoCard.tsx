import { Play } from "lucide-react";
import Link from "next/link";
import { youtubeThumbnail, type Video } from "@/lib/models";

/**
 * Video card. `featured` is the homepage's cinematic lead: a large thumbnail with the
 * title set over a dark gradient. Thumbnails are the real video thumbnails only.
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
  const src = video.thumbnail ?? youtubeThumbnail(video.youtubeVideoId);
  if (featured) {
    return (
      <li className="lg:col-span-2 lg:row-span-2">
        <Link
          href={`/videos/${video.slug}`}
          className="card-lift group relative block h-full overflow-hidden rounded-lg border border-border-subtle bg-surface-container-lowest hover:border-border-medium"
        >
          <span className={`relative block h-full min-h-full w-full ${alone ? "aspect-video md:aspect-[21/9]" : "aspect-video"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails come from workshop content or YouTube, not a fixed set of domains */}
            <img
              src={src}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.03]"
            />
            <span className="absolute inset-0 bg-[linear-gradient(to_top,rgb(9_11_13/0.95),rgb(9_11_13/0.35)_45%,transparent_75%)]" />
            <span className="absolute inset-x-0 bottom-0 flex items-end gap-space-md p-space-md md:p-8">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-container transition-transform motion-safe:group-hover:scale-105 md:h-14 md:w-14">
                <Play className="h-5 w-5 translate-x-px" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col gap-space-xs">
                <span className="font-code text-label-badge uppercase tracking-[0.16em] text-text-muted">Latest video</span>
                <span className="font-headline text-headline-sm text-text-primary md:text-headline-md">{video.title}</span>
                {video.description && (
                  <span className="hidden text-body-sm text-text-muted md:line-clamp-2">{video.description}</span>
                )}
              </span>
            </span>
          </span>
        </Link>
      </li>
    );
  }
  return (
    <li>
      <Link
        href={`/videos/${video.slug}`}
        className="card-lift group flex h-full flex-col gap-space-sm rounded-lg border border-border-subtle bg-surface-raised p-space-sm hover:border-border-medium hover:bg-surface-card"
      >
        <div className="relative aspect-video overflow-hidden rounded bg-surface-card">
          {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails come from workshop content or YouTube, not a fixed set of domains */}
          <img
            src={src}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.04]"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/10">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container shadow-lg">
              <Play className="h-5 w-5 translate-x-px" aria-hidden="true" />
            </span>
          </span>
        </div>
        <span className="flex flex-col gap-space-xs px-space-xs pb-space-xs">
          <span className="font-headline text-headline-sm text-text-primary">{video.title}</span>
          {video.description && <span className="line-clamp-2 text-body-sm text-text-muted">{video.description}</span>}
        </span>
      </Link>
    </li>
  );
}
