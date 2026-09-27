import { ExternalLink } from "lucide-react";
import { AnchorButton } from "@/components/ui/Button";
import { YouTubeFacade } from "@/components/home/YouTubeFacade";
import type { VideoType } from "@/lib/models";

export function VideoEmbed({
  videoId,
  title,
  youtubeUrl,
  videoType,
  poster,
}: {
  videoId: string;
  title: string;
  youtubeUrl: string;
  videoType?: VideoType;
  /** The video's custom thumbnail, if it has one. */
  poster?: string;
}) {
  return (
    <div className="flex flex-col gap-space-sm">
      <YouTubeFacade videoId={videoId} title={title} videoType={videoType} poster={poster} />
      <AnchorButton href={youtubeUrl} target="_blank" rel="noopener" variant="secondary" className="self-start">
        Watch on YouTube <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </AnchorButton>
    </div>
  );
}
