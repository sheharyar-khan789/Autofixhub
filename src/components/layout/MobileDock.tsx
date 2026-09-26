import { BookOpen, Search, SquarePlay } from "lucide-react";
import Link from "next/link";
import type { BusinessSettings } from "@/lib/models";

/**
 * Fixed bottom bar below the lg breakpoint: the knowledge platform's three main
 * actions. The YouTube cell only appears when a channel URL is set.
 */
export function MobileDock({ settings }: { settings: BusinessSettings | null }) {
  const cell =
    "flex flex-col items-center justify-center gap-0.5 text-body-sm font-semibold text-text-primary";
  const youtube = settings?.socialLinks?.youtube;
  const cols = youtube ? 3 : 2;
  return (
    <nav
      aria-label="Quick links"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border-subtle bg-surface-container-lowest pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="grid h-16" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        <Link href="/guides" className={cell}>
          <BookOpen className="h-5 w-5 text-status-fault-red" aria-hidden="true" /> Guides
        </Link>
        <Link href="/search" className={cell}>
          <Search className="h-5 w-5" aria-hidden="true" /> Search
        </Link>
        {youtube && (
          <a href={youtube} target="_blank" rel="noopener noreferrer" className={`${cell} bg-primary-container`}>
            <SquarePlay className="h-5 w-5" aria-hidden="true" /> YouTube
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
    </nav>
  );
}
