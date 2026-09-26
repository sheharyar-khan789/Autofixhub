import { ArrowRight, SquarePlay } from "lucide-react";
import Link from "next/link";
import type { BusinessSettings } from "@/lib/models";
import { CarScrollHero, type HeroSpec } from "./CarScrollHero";

const cta =
  "group inline-flex min-h-12 items-center justify-center gap-space-sm rounded px-space-md font-headline text-[0.8125rem] font-bold uppercase tracking-[0.14em] transition-colors sm:px-space-lg";

/** What the platform covers, in the site's own confirmed wording (no statistics, no claims). */
const SPECS: HeroSpec[] = [
  { label: "Vehicles", value: "Volkswagen Group diesel and Toyota hybrid" },
  { label: "Systems", value: "DPF, turbo, injectors, gearbox and wiring faults" },
  { label: "Format", value: "Written repair guides and YouTube videos" },
];

export function HomeHero({ settings }: { settings: BusinessSettings | null }) {
  const caption = settings?.heroCaption ?? "Toyota Corolla Hybrid: illustrative animation";
  const youtube = settings?.socialLinks?.youtube;
  const secondary = `${cta} border border-text-primary/25 text-text-primary hover:border-text-primary/60`;
  return (
    <CarScrollHero
      caption={caption}
      wordmark={settings?.tradingName ?? "AutoFixHub"}
      specs={SPECS}
      actions={
        <>
          <p className="hidden text-body-lg text-text-muted sm:block">
            Step-by-step repair guides, fault-code explanations and diagnostic videos for Volkswagen Group diesel and
            Toyota hybrid vehicles.
          </p>
          <div className="grid grid-cols-2 gap-space-sm sm:flex sm:flex-wrap">
            <Link href="/guides" className={`${cta} bg-primary-container text-text-primary hover:bg-accent-red-hover`}>
              Explore guides
              <ArrowRight
                className="hidden h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5 sm:block"
                aria-hidden="true"
              />
            </Link>
            {youtube ? (
              <a href={youtube} target="_blank" rel="noopener noreferrer" className={secondary}>
                <SquarePlay className="h-4 w-4 shrink-0 text-status-fault-red" aria-hidden="true" />
                Watch on YouTube
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <Link href="/videos" className={secondary}>
                Watch videos
              </Link>
            )}
          </div>
        </>
      }
    >
      <p className="flex items-center gap-space-sm font-code text-label-badge uppercase tracking-[0.16em] text-text-muted sm:tracking-[0.24em]">
        <span className="h-px w-6 bg-status-fault-red max-[359px]:hidden" aria-hidden="true" />
        Automotive repair knowledge
      </p>
      <h1 className="font-headline text-[clamp(1.875rem,8vw,2.75rem)] font-medium leading-[1.05] tracking-[-0.03em] text-text-primary sm:text-[3rem] lg:text-[clamp(2.75rem,3.6vw,3.75rem)]">
        Automotive knowledge <span className="text-text-primary/55 sm:block">without the guesswork.</span>
      </h1>
      <p className="text-body-md text-text-muted sm:hidden">Repair guides, fault codes and diagnostic videos.</p>
    </CarScrollHero>
  );
}
