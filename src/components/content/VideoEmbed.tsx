import { ExternalLink } from "lucide-react";
import { AnchorButton } from "@/components/ui/Button";
import { YouTubeFacade } from "@/components/home/YouTubeFacade";

export function VideoEmbed({
  videoId,
  title,
  youtubeUrl,
}: {
  videoId: string;
  title: string;
  youtubeUrl: string;
}) {
  return (
    <div className="flex flex-col gap-space-sm">
      <YouTubeFacade videoId={videoId} title={title} />
      <AnchorButton href={youtubeUrl} target="_blank" rel="noopener" variant="secondary" className="self-start">
        Watch on YouTube <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </AnchorButton>
    </div>
  );
}
