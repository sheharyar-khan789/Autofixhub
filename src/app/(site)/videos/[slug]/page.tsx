import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { videosNotice } from "@/components/content/ContentState";
import { JsonLd } from "@/components/content/JsonLd";
import { RelatedContent } from "@/components/content/RelatedContent";
import { VideoEmbed } from "@/components/content/VideoEmbed";
import { LinkButton } from "@/components/ui/Button";
import { getKnowledgeContent, getSettingsOrNull, getVideo, getVideos } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { youtubeThumbnail } from "@/lib/models";
import { breadcrumbJsonLd, videoObjectJsonLd } from "@/lib/seo";

export const revalidate = 60;

export async function generateStaticParams() {
  const videos = await getVideos();
  return videos.ok ? videos.value.map((v) => ({ slug: v.slug })) : [];
}

export async function generateMetadata({ params }: PageProps<"/videos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const result = await getVideo(slug);
  if (!result.ok || !result.value) return { title: "Video", robots: { index: false } };
  const v = result.value;
  const description = v.description || v.title;
  const image = v.thumbnail ?? youtubeThumbnail(v.youtubeVideoId);
  return {
    title: v.title,
    description,
    alternates: { canonical: `/videos/${v.slug}` },
    openGraph: { type: "video.other", title: v.title, description, images: [image] },
    twitter: { card: "summary_large_image", title: v.title, description },
  };
}

/** "PT8M12S" -> "8:12" (only called with a validated ISO duration). */
function formatDuration(iso: string): string {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return iso;
  const [h, min, s] = [Number(m[1] ?? 0), Number(m[2] ?? 0), Number(m[3] ?? 0)];
  const mm = h ? String(min).padStart(2, "0") : String(min);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

export default async function VideoPage({ params }: PageProps<"/videos/[slug]">) {
  const { slug } = await params;
  const result = await getVideo(slug);

  if (!result.ok) {
    return (
      <div className="px-gutter py-space-xl">
        <div className="mx-auto max-w-3xl">{videosNotice(result)}</div>
      </div>
    );
  }
  const video = result.value;
  if (!video) notFound();

  const base = siteUrl();
  const [content, settings] = await Promise.all([getKnowledgeContent(), getSettingsOrNull()]);
  const primaryGuide = content.guides.find((g) => g.slug === video.relatedGuideSlug);
  // Guides linked to this video from either side.
  const guides = content.guides.filter((g) => g.slug === video.relatedGuideSlug || g.relatedVideoIds?.includes(video.id));
  const faultCodes = content.faultCodes.filter((f) => video.relatedFaultCodes?.includes(f.code));
  const categories = content.categories.filter((c) => video.categorySlugs?.includes(c.slug));
  const meta = [
    [video.vehicleMake, video.vehicleModel].filter(Boolean).join(" "),
    video.uploadDate
      ? `On YouTube since ${new Date(`${video.uploadDate}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
      : "",
    video.duration ? formatDuration(video.duration) : "",
  ].filter(Boolean);

  return (
    <div className="px-gutter py-space-xl">
      <JsonLd data={videoObjectJsonLd(video, base)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: base },
          { name: "Videos", url: `${base}/videos` },
          { name: video.title, url: `${base}/videos/${video.slug}` },
        ])}
      />
      <div className="mx-auto grid max-w-7xl gap-space-xl lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="flex max-w-3xl flex-col gap-space-lg">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Videos", href: "/videos" },
              { name: video.title, href: `/videos/${video.slug}` },
            ]}
          />
          <header className="flex flex-col gap-space-sm">
            {video.category && (
              <span className="font-code text-label-badge uppercase tracking-wider text-status-fault-red">{video.category}</span>
            )}
            <h1 className="font-headline text-headline-xl-mobile text-text-primary md:text-headline-xl">{video.title}</h1>
            {meta.length > 0 && <p className="font-code text-label-code text-text-muted">{meta.join(" · ")}</p>}
          </header>

          <VideoEmbed videoId={video.youtubeVideoId} title={video.title} youtubeUrl={video.youtubeUrl} />

          {video.description && <p className="whitespace-pre-line text-body-md text-text-primary">{video.description}</p>}

          {primaryGuide && (
            <div className="flex flex-col items-start gap-space-sm rounded border border-border-subtle bg-surface-raised p-space-lg">
              <p className="font-headline text-headline-sm text-text-primary">Read the written guide</p>
              <p className="text-body-md text-text-muted">{primaryGuide.excerpt}</p>
              <LinkButton href={`/guides/${primaryGuide.slug}`} variant="secondary">
                {primaryGuide.title}
              </LinkButton>
            </div>
          )}
        </article>

        <aside className="h-fit lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
          <RelatedContent
            guides={guides}
            faultCodes={faultCodes}
            categories={categories}
            channelUrl={settings.socialLinks?.youtube}
          />
        </aside>
      </div>
    </div>
  );
}
