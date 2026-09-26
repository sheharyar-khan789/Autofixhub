import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, type Crumb } from "@/components/content/Breadcrumbs";
import { guidesNotice } from "@/components/content/ContentState";
import { FaqSection } from "@/components/content/FaqSection";
import { JsonLd } from "@/components/content/JsonLd";
import { RelatedContent } from "@/components/content/RelatedContent";
import { VideoEmbed } from "@/components/content/VideoEmbed";
import { StateNotice } from "@/components/ui/Section";
import { isSafeImageRef } from "@/lib/admin/forms";
import { relatedGuides, videosForGuide } from "@/lib/content";
import { getGuide, getGuides, getKnowledgeContent, getSettingsOrNull } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { FUEL_TYPE_LABELS, type Guide } from "@/lib/models";
import { youtubeWatchUrl } from "@/lib/admin/youtube";
import { breadcrumbJsonLd, faqJsonLd, guideArticleJsonLd } from "@/lib/seo";

export const revalidate = 60;

export async function generateStaticParams() {
  const guides = await getGuides();
  return guides.ok ? guides.value.map((g) => ({ slug: g.slug })) : [];
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide.ok || !guide.value) return { title: "Guide", robots: { index: false } };
  const g = guide.value;
  const title = g.seoTitle || g.title;
  const description = g.seoDescription || g.excerpt;
  const image = [g.ogImage, g.featuredImage].find((i) => i && isSafeImageRef(i));
  return {
    title,
    description,
    alternates: { canonical: g.canonicalUrl ?? `/guides/${g.slug}` },
    robots: g.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "article",
      title,
      description,
      images: image ? [image] : undefined,
      publishedTime: g.publishedAt,
      modifiedTime: g.updatedAt,
      authors: g.author ? [g.author] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description },
  };
}

const paras = (t?: string) => (t ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

function TextSection({ title, text }: { title: string; text?: string }) {
  const ps = paras(text);
  if (ps.length === 0) return null;
  return (
    <section className="flex flex-col gap-space-sm">
      <h2 className="font-headline text-headline-sm text-text-primary">{title}</h2>
      {ps.map((p, i) => (
        <p key={i} className="whitespace-pre-line text-body-md text-text-primary">{p}</p>
      ))}
    </section>
  );
}

function ListSection({ title, items, ordered }: { title: string; items?: string[]; ordered?: boolean }) {
  if (!items?.length) return null;
  const List = ordered ? "ol" : "ul";
  return (
    <section className="flex flex-col gap-space-xs">
      <h2 className="font-headline text-headline-sm text-text-primary">{title}</h2>
      <List className={`${ordered ? "list-decimal" : "list-disc"} pl-space-lg text-body-md text-text-primary`}>
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </List>
    </section>
  );
}

function yearsOf(g: Guide): string | undefined {
  if (g.vehicleYearFrom && g.vehicleYearTo) {
    return g.vehicleYearFrom === g.vehicleYearTo ? String(g.vehicleYearFrom) : `${g.vehicleYearFrom}–${g.vehicleYearTo}`;
  }
  return (g.vehicleYearFrom ?? g.vehicleYearTo)?.toString();
}

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : undefined;

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const guideResult = await getGuide(slug);

  if (!guideResult.ok) {
    return (
      <div className="px-gutter py-space-xl">
        <div className="mx-auto max-w-3xl">{guidesNotice(guideResult)}</div>
      </div>
    );
  }
  const guide = guideResult.value;
  if (!guide) notFound();

  const base = siteUrl();
  const [content, settings] = await Promise.all([getKnowledgeContent(), getSettingsOrNull()]);
  const categories = content.categories.filter((c) => guide.categorySlugs?.includes(c.slug));
  const vehicleCategory = categories.find((c) => c.kind === "vehicle");
  const publishedCodes = new Map(content.faultCodes.map((f) => [f.code, f]));
  const codes = guide.relatedFaultCodes ?? [];
  const related = relatedGuides(guide, content.guides);
  const videos = videosForGuide(guide, content.videos);
  // The guide's own YouTube link wins; otherwise embed the first linked video record.
  const embed = guide.youtubeVideoId
    ? { id: guide.youtubeVideoId, title: guide.title, url: youtubeWatchUrl(guide.youtubeVideoId) }
    : videos[0]
      ? { id: videos[0].youtubeVideoId, title: videos[0].title, url: videos[0].youtubeUrl }
      : null;

  const crumbs: Crumb[] = [
    { name: "Home", href: "/" },
    { name: "Guides", href: "/guides" },
    ...(vehicleCategory ? [{ name: vehicleCategory.name, href: `/categories/${vehicleCategory.slug}` }] : []),
    { name: guide.title, href: `/guides/${guide.slug}` },
  ];
  const vehicleRows = [
    ["Make", guide.vehicleMake],
    ["Model", guide.vehicleModel],
    ["Generation", guide.vehicleGeneration],
    ["Years", yearsOf(guide)],
    ["Engine", guide.engine],
    ["Fuel", guide.fuelType ? FUEL_TYPE_LABELS[guide.fuelType] : undefined],
  ].filter((r): r is [string, string] => !!r[1]);
  const image = guide.featuredImage && isSafeImageRef(guide.featuredImage) ? guide.featuredImage : undefined;

  return (
    <div className="px-gutter py-space-xl">
      <JsonLd data={guideArticleJsonLd(guide, base, settings.tradingName)} />
      <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ name: c.name, url: `${base}${c.href === "/" ? "" : c.href}` })))} />
      <JsonLd data={faqJsonLd(guide.faqs)} />
      <div className="mx-auto grid max-w-7xl gap-space-xl lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="flex max-w-3xl flex-col gap-space-lg">
          <Breadcrumbs items={crumbs} />
          <header className="flex flex-col gap-space-sm">
            {guide.problemCategory && (
              <span className="font-code text-label-badge uppercase tracking-wider text-status-fault-red">
                {guide.problemCategory}
              </span>
            )}
            <h1 className="font-headline text-headline-xl-mobile text-text-primary md:text-headline-xl">{guide.title}</h1>
            <p className="text-body-lg text-text-muted">{guide.excerpt}</p>
          </header>

          {/* eslint-disable-next-line @next/next/no-img-element -- author-supplied https or site image, validated on save */}
          {image && <img src={image} alt="" className="w-full rounded border border-border-subtle" />}

          {vehicleRows.length > 0 && (
            <dl
              aria-label="Vehicle information"
              className="grid grid-cols-2 gap-space-sm rounded border border-border-subtle bg-surface-raised p-space-md text-body-sm sm:grid-cols-3"
            >
              {vehicleRows.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-text-muted">{k}</dt>
                  <dd className="font-semibold text-text-primary">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          {paras(guide.content).map((p, i) => (
            <p key={i} className="whitespace-pre-line text-body-md text-text-primary">{p}</p>
          ))}

          <ListSection title="Symptoms" items={guide.symptoms} />
          <ListSection title="Possible causes" items={guide.possibleCauses} />
          <TextSection title="Diagnosis" text={guide.diagnosis} />
          <ListSection title="Recommended checks" items={guide.recommendedChecks} ordered />
          <TextSection title="Repair information" text={guide.repairInfo} />

          {codes.length > 0 && (
            <section className="flex flex-col gap-space-xs">
              <h2 className="font-headline text-headline-sm text-text-primary">Fault codes</h2>
              <ul className="flex flex-wrap gap-space-xs">
                {codes.map((code) => {
                  const fc = publishedCodes.get(code);
                  return (
                    <li key={code}>
                      {fc ? (
                        <Link
                          href={`/fault-codes/${code.toLowerCase()}`}
                          className="inline-flex min-h-11 items-center rounded border border-border-medium bg-surface-card px-space-md font-code text-body-sm text-text-primary hover:border-text-muted"
                        >
                          {code} <span className="ml-space-xs text-text-muted">{fc.title}</span>
                        </Link>
                      ) : (
                        <span className="inline-flex min-h-11 items-center rounded border border-border-subtle px-space-md font-code text-body-sm text-text-muted">
                          {code}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {guide.warnings?.length ? (
            <StateNotice title="Important notes" tone="error">
              <ul className="list-disc pl-space-lg">
                {guide.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </StateNotice>
          ) : null}

          {embed && (
            <section className="flex flex-col gap-space-sm" aria-labelledby="guide-video">
              <h2 id="guide-video" className="font-headline text-headline-sm text-text-primary">Video</h2>
              <VideoEmbed videoId={embed.id} title={embed.title} youtubeUrl={embed.url} />
            </section>
          )}

          <FaqSection faqs={guide.faqs} />

          <footer className="border-t border-border-subtle pt-space-md font-code text-label-telemetry text-text-muted">
            {[
              guide.author ? `Written by ${guide.author}` : null,
              guide.publishedAt ? `Published ${formatDate(guide.publishedAt)}` : null,
              guide.updatedAt ? `Last updated ${formatDate(guide.updatedAt)}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </footer>
        </article>

        <aside className="h-fit lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
          <RelatedContent
            videos={videos}
            guides={related}
            faultCodes={codes.map((c) => publishedCodes.get(c)).filter((f) => f !== undefined)}
            categories={categories}
            channelUrl={settings.socialLinks?.youtube}
          />
        </aside>
      </div>
    </div>
  );
}
