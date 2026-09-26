import type { Metadata } from "next";
import Link from "next/link";
import { YouTubeChannelLink } from "@/components/content/YouTubeChannelLink";
import { CONFIRMED_BUSINESS } from "@/lib/business";
import { getSettingsOrNull } from "@/lib/data";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "About",
  description:
    "Who is behind AutoFixHub: 5 years of hands-on work on Volkswagen Group diesel vehicles and the Toyota Prius and Corolla Hybrid, shared as repair guides and YouTube videos.",
  alternates: { canonical: "/about" },
};

const paras = (t?: string) => t?.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean) ?? [];

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="flex flex-col gap-space-md">
      <h2 id={`${id}-h`} className="font-headline text-headline-md text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Built from owner-confirmed facts (src/lib/business.ts) plus anything saved in the
 * settings document. No qualifications, certifications or affiliations are claimed.
 */
export default async function AboutPage() {
  const settings = await getSettingsOrNull();
  const name = settings.tradingName ?? CONFIRMED_BUSINESS.name;
  const about = settings.about;
  const verified = (settings.accreditations ?? []).filter((a) => a.verified);
  const { company, place } = CONFIRMED_BUSINESS.workExperience;

  return (
    <div className="px-gutter py-space-xl">
      <div className="mx-auto flex max-w-4xl flex-col gap-space-xl">
        <header className="flex flex-col gap-space-sm">
          <h1 className="font-headline text-headline-xl-mobile text-text-primary md:text-headline-xl">About {name}</h1>
          <p className="text-body-lg text-text-muted">
            {name} shares automotive repair knowledge from hands-on work: written guides, fault code explanations and
            YouTube videos, focused on the vehicles and problems actually worked on.
          </p>
        </header>

        {paras(about?.story).length > 0 && (
          <Block id="story" title="Our story">
            {paras(about?.story).map((p, i) => (
              <p key={i} className="text-body-lg text-text-muted">{p}</p>
            ))}
          </Block>
        )}

        <Block id="experience" title="Experience">
          {paras(about?.experience).map((p, i) => (
            <p key={i} className="text-body-md text-text-muted">{p}</p>
          ))}
          <p className="text-body-md text-text-muted">
            This experience includes work with {company} in {place}. {name} is a separate project and is not {company}.
          </p>
        </Block>

        <Block id="vehicles" title="Vehicles covered">
          <ul className="grid list-inside list-disc gap-space-xs text-body-md text-text-muted sm:grid-cols-2">
            {CONFIRMED_BUSINESS.vehicles.map((v) => <li key={v}>{v}</li>)}
          </ul>
        </Block>

        <Block id="areas" title="Technical areas">
          <ul className="grid list-inside list-disc gap-space-xs text-body-md text-text-muted sm:grid-cols-2">
            {CONFIRMED_BUSINESS.technicalAreas.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </Block>

        {about?.team?.length ? (
          <Block id="team" title="The team">
            <ul className="grid gap-space-md sm:grid-cols-2">
              {about.team.map((m) => (
                <li key={m.name} className="rounded border border-border-subtle bg-surface-raised p-space-md">
                  <p className="font-headline text-headline-sm text-text-primary">{m.name}</p>
                  <p className="font-code text-label-code text-text-muted">{m.role}</p>
                  {m.bio && <p className="mt-space-xs text-body-sm text-text-muted">{m.bio}</p>}
                </li>
              ))}
            </ul>
          </Block>
        ) : null}

        {verified.length > 0 && (
          <Block id="trust" title="Accreditations">
            <ul className="flex flex-wrap gap-space-sm">
              {verified.map((a) => (
                <li key={a.name} className="rounded border border-border-medium bg-surface-card px-space-md py-space-sm font-code text-label-code">
                  {a.name}{a.body ? `, ${a.body}` : ""}{a.referenceNumber ? ` (${a.referenceNumber})` : ""}
                </li>
              ))}
            </ul>
          </Block>
        )}

        <Block id="content" title="Guides and videos">
          <p className="text-body-md text-text-muted">
            Guides explain symptoms, likely causes and how a problem is diagnosed. They describe what has been seen in
            practice; they are general information, not a diagnosis of your vehicle.
          </p>
          <div className="flex flex-wrap items-center gap-space-md">
            <Link href="/guides" className="font-code text-body-sm font-semibold underline underline-offset-4">Read the guides</Link>
            <YouTubeChannelLink href={settings.socialLinks?.youtube} />
          </div>
        </Block>
      </div>
    </div>
  );
}
