import { ArrowRight, ArrowUpRight, Mail, SquarePlay } from "lucide-react";
import Link from "next/link";
import { FaultCodeCard } from "@/components/content/FaultCodeCard";
import { GuideCard } from "@/components/content/GuideCard";
import { SearchForm } from "@/components/content/SearchForm";
import { VideoCard } from "@/components/content/VideoCard";
import { YouTubeChannelLink } from "@/components/content/YouTubeChannelLink";
import { LinkButton } from "@/components/ui/Button";
import { Section, StateNotice } from "@/components/ui/Section";
import type { CategoryWithCount } from "@/lib/content";
import type { BusinessSettings, FaultCode, Guide, Video } from "@/lib/models";

/**
 * Homepage sections for the knowledge platform. Every section is driven by published
 * content; a section with nothing real to show either explains that honestly or hides.
 * Surfaces alternate (graphite, base, technical, cinematic) so the page reads as a
 * sequence of chapters rather than a stack of identical card grids.
 */

const textLink =
  "group inline-flex min-h-11 items-center gap-space-xs font-code text-body-sm font-semibold text-text-primary underline decoration-border-medium underline-offset-4 transition-colors hover:decoration-text-primary";

function TopicLinks({ items }: { items: CategoryWithCount[] }) {
  return (
    <ul className="flex flex-wrap gap-space-sm">
      {items.map(({ category, count }) => (
        <li key={category.id}>
          <Link
            href={`/categories/${category.slug}`}
            className="inline-flex min-h-11 items-center gap-space-sm rounded border border-border-medium bg-surface-container-lowest/60 px-space-md py-space-sm font-code text-body-sm text-text-primary transition-colors hover:border-text-muted"
          >
            {category.name}
            <span className="tabular-nums text-text-muted">{count}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Search is the product's main entry point: a wide, calm console right after the hero. */
export function HomeSearch({ topics }: { topics: CategoryWithCount[] }) {
  const popular = [...topics].sort((a, b) => b.count - a.count).slice(0, 10);
  return (
    <Section
      id="search"
      tone="raised"
      index="01"
      eyebrow="Search"
      title="Find the answer to your car problem"
      lead="Search by fault code, warning light, symptom, part or vehicle."
    >
      <div className="rounded-lg border border-border-medium bg-surface-container-lowest/70 p-space-md shadow-[0_24px_60px_-30px_rgb(0_0_0/0.8)] md:p-space-lg">
        <SearchForm size="lg" />
        {popular.length > 0 && (
          <div className="mt-space-lg flex flex-col gap-space-sm border-t border-border-subtle pt-space-md">
            <p className="font-code text-label-badge uppercase tracking-[0.2em] text-text-muted">Popular topics</p>
            <TopicLinks items={popular} />
          </div>
        )}
      </div>
      <div>
        <Link href="/categories" className={textLink}>
          All categories
          <ArrowRight className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </Section>
  );
}

export function LatestGuides({ guides, youtube }: { guides: Guide[]; youtube?: string }) {
  return (
    <Section
      id="latest-guides"
      index="02"
      eyebrow="Knowledge base"
      title="Latest repair guides"
      action={guides.length > 0 ? <LinkButton href="/guides" variant="secondary">All guides</LinkButton> : undefined}
    >
      {guides.length > 0 ? (
        <ul className="grid gap-space-md sm:grid-cols-2 lg:grid-cols-3">
          {guides.slice(0, 5).map((g, i) => (
            <GuideCard key={g.id} guide={g} featured={i === 0 && guides.length > 1} />
          ))}
        </ul>
      ) : (
        <StateNotice title="The first guides are being written">
          Guides are published from first-hand repair work. In the meantime, the repair videos are on YouTube.
          {youtube && (
            <span className="mt-space-sm block">
              <YouTubeChannelLink href={youtube} />
            </span>
          )}
        </StateNotice>
      )}
    </Section>
  );
}

const WARNING_LIGHTS: { name: string; note: string }[] = [
  { name: "Engine management", note: "A fault was logged in the engine or emissions control system." },
  { name: "Diesel particulate filter", note: "The filter may be blocked or a related sensor has a fault." },
  { name: "Hybrid system", note: "A fault in the high-voltage system. Do not ignore it." },
  { name: "Battery or charging", note: "The charging system may not be keeping the battery charged." },
  { name: "ABS or stability control", note: "The anti-lock or stability system has detected a fault." },
  { name: "Airbag (SRS)", note: "A fault in the airbag or seat belt system. Have it checked promptly." },
];

export function FaultCodeSection({ codes }: { codes: FaultCode[] }) {
  return (
    <Section
      id="fault-codes"
      tone="technical"
      index="03"
      eyebrow="Diagnostics"
      title="Warning lights and fault codes"
      lead="A warning light shows which system has logged a fault, not which part has failed. The fault code narrows it down, but it is a starting point for diagnosis, not a confirmed repair."
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <h3 className="font-code text-label-badge uppercase tracking-[0.2em] text-text-muted">Common warning lights</h3>
          <dl className="mt-space-md divide-y divide-border-subtle border-y border-border-subtle">
            {WARNING_LIGHTS.map((w, i) => (
              <div key={w.name} className="grid grid-cols-[2rem_1fr] gap-x-space-sm gap-y-1 py-space-md">
                <span className="row-span-2 font-code text-label-telemetry tabular-nums text-status-fault-red" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <dt className="font-code text-label-code text-text-primary">{w.name}</dt>
                <dd className="text-body-sm text-text-muted">{w.note}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex flex-col gap-space-md">
          <h3 className="font-code text-label-badge uppercase tracking-[0.2em] text-text-muted">Fault code database</h3>
          {codes.length > 0 ? (
            <ul className="grid gap-space-sm sm:grid-cols-2">
              {codes.slice(0, 4).map((c) => (
                <FaultCodeCard key={c.id} code={c} />
              ))}
            </ul>
          ) : (
            <p className="text-body-md text-text-muted">Fault code explanations will be listed here once they are published.</p>
          )}
          <div>
            <LinkButton href="/fault-codes">Look up a fault code</LinkButton>
          </div>
        </div>
      </div>
    </Section>
  );
}

export function VehicleCategories({ vehicles }: { vehicles: CategoryWithCount[] }) {
  if (vehicles.length === 0) return null;
  return (
    <Section id="vehicles" index="04" eyebrow="Vehicles" title="Browse by vehicle">
      <ul className="grid gap-space-md md:grid-cols-2">
        {vehicles.map(({ category, count }) => (
          <li key={category.id}>
            <Link
              href={`/categories/${category.slug}`}
              className="card-lift group relative flex h-full min-h-56 flex-col justify-between gap-space-lg overflow-hidden rounded-lg border border-border-subtle bg-[linear-gradient(160deg,var(--color-surface-card),var(--color-surface-container-lowest)_70%)] p-space-lg hover:border-border-medium md:min-h-72 md:p-8"
            >
              {/* Blueprint corner marks: the same drawing language as the hero. */}
              <span aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 border-l border-t border-text-primary/25" />
              <span aria-hidden="true" className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 border-b border-r border-text-primary/25" />
              <span className="flex items-start justify-between gap-space-md">
                <span className="font-code text-label-badge uppercase tracking-[0.2em] text-text-muted">
                  {count} {count === 1 ? "article" : "articles"}
                </span>
                <ArrowUpRight
                  className="h-5 w-5 text-text-muted transition-transform group-hover:text-text-primary motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
              <span className="flex flex-col gap-space-sm">
                <span className="font-headline text-[2rem] font-bold leading-[1.05] tracking-[-0.02em] text-text-primary md:text-[2.75rem]">
                  {category.name}
                </span>
                {category.description && <span className="max-w-md text-body-md text-text-muted">{category.description}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function LatestVideos({ videos, youtube }: { videos: Video[]; youtube?: string }) {
  if (videos.length === 0 && !youtube) return null;
  const [lead, ...rest] = videos.slice(0, 3);
  return (
    <Section
      id="latest-videos"
      tone="cinematic"
      index="05"
      eyebrow="YouTube"
      title={videos.length > 0 ? "Latest videos" : "Repair videos on YouTube"}
      lead="Repair and diagnostic videos on Volkswagen Group diesel and Toyota hybrid vehicles."
    >
      {lead && (
        <ul className={`grid gap-space-md ${rest.length > 0 ? "lg:grid-cols-3" : ""}`}>
          <VideoCard video={lead} featured alone={rest.length === 0} />
          {rest.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-space-sm">
        {videos.length > 0 && <LinkButton href="/videos" variant="secondary">All videos</LinkButton>}
        <YouTubeChannelLink href={youtube} />
      </div>
    </Section>
  );
}

export function AboutAutoFixHub({ settings }: { settings: BusinessSettings }) {
  const name = settings.tradingName ?? "AutoFixHub";
  const items = settings.whyChooseUs ?? [];
  return (
    <Section
      id="about"
      tone="raised"
      index="06"
      eyebrow="Who we are"
      title={`About ${name}`}
      lead={settings.about?.experience?.split(/\n{2,}/)[0]}
    >
      {items.length > 0 && (
        <ul className="grid gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle md:grid-cols-3">
          {items.map((i) => (
            <li key={i.title} className="bg-surface-raised p-space-lg">
              <h3 className="font-headline text-headline-sm text-text-primary">{i.title}</h3>
              <p className="mt-space-xs text-body-md text-text-muted">{i.text}</p>
            </li>
          ))}
        </ul>
      )}
      <div>
        <Link href="/about" className={textLink}>
          More about {name}
          <ArrowRight className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </Section>
  );
}

/**
 * Closing chapter: back to the dark studio. The YouTube channel (when configured) and
 * the confirmed contact route, nothing else.
 */
export function FinalCta({ settings }: { settings: BusinessSettings }) {
  const youtube = settings.socialLinks?.youtube;
  return (
    <section aria-label="Watch and get in touch" className="section-rule section-cinematic px-gutter py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-16">
        {youtube ? (
          <div className="flex flex-col gap-space-md">
            <p className="flex items-center gap-space-sm font-code text-label-badge uppercase tracking-[0.2em] text-text-muted">
              <SquarePlay className="h-4 w-4 text-status-fault-red" aria-hidden="true" /> YouTube
            </p>
            <h2
              id="youtube-cta-heading"
              className="font-headline text-[2rem] font-bold leading-[1.05] tracking-[-0.025em] text-text-primary md:text-[3.25rem]"
            >
              Watch the repairs on YouTube
            </h2>
            <p className="max-w-xl text-body-lg text-text-muted">
              Diagnosis and repair videos, with links back to the written guides here.
            </p>
            <div className="mt-space-sm">
              <YouTubeChannelLink href={youtube} label="Open the YouTube channel" variant="primary" />
            </div>
          </div>
        ) : (
          <div />
        )}
        <div className="flex flex-col gap-space-md border-t border-border-subtle pt-space-lg lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <h2 id="contact-heading" className="font-headline text-headline-md text-text-primary">
            Get in touch
          </h2>
          <p className="text-body-md text-text-muted">Questions about a guide or a video, or a topic you would like covered.</p>
          {settings.email && (
            <a
              href={`mailto:${settings.email}`}
              className="inline-flex min-h-11 items-center gap-space-sm break-all text-body-lg text-text-primary transition-colors hover:text-primary"
            >
              <Mail className="h-5 w-5 shrink-0 text-text-muted" aria-hidden="true" /> {settings.email}
            </a>
          )}
          <div>
            <Link href="/contact" className={textLink}>
              Contact page
              <ArrowRight className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
