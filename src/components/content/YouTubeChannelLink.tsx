import { ExternalLink, SquarePlay } from "lucide-react";
import { AnchorButton } from "@/components/ui/Button";

/** Link out to the confirmed YouTube channel (from settings.socialLinks.youtube). */
export function YouTubeChannelLink({
  href,
  label = "Watch on the YouTube channel",
  variant = "secondary",
  className = "",
}: {
  href: string | undefined;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  if (!href) return null;
  return (
    <AnchorButton href={href} target="_blank" rel="noopener noreferrer" variant={variant} className={className}>
      <SquarePlay className="h-4 w-4 text-status-fault-red" aria-hidden="true" /> {label}
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">(opens YouTube in a new tab)</span>
    </AnchorButton>
  );
}
