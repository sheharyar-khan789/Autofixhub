import type { Metadata } from "next";
import { VideoCard } from "@/components/content/VideoCard";
import { videosNotice } from "@/components/content/ContentState";
import { Pagination } from "@/components/content/Pagination";
import { SearchForm } from "@/components/content/SearchForm";
import { paginate } from "@/lib/content";
import { YouTubeChannelLink } from "@/components/content/YouTubeChannelLink";
import { getSettingsOrNull, getVideos } from "@/lib/data";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Repair and Diagnostic Videos",
  description:
    "Repair and diagnostic videos on Volkswagen Group diesel and Toyota hybrid vehicles, hosted on YouTube.",
  alternates: { canonical: "/videos" },
};

export default async function VideosPage({ searchParams }: PageProps<"/videos">) {
  const { page: rawPage } = await searchParams;
  const [videos, settings] = await Promise.all([getVideos(), getSettingsOrNull()]);
  const notice = videosNotice(videos);
  const page = paginate(videos.ok ? videos.value : [], rawPage);

  return (
    <div className="px-gutter py-space-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-space-xl">
        <header className="flex max-w-3xl flex-col gap-space-sm">
          <h1 className="font-headline text-headline-xl-mobile text-text-primary md:text-headline-xl">Videos</h1>
          <p className="text-body-lg text-text-muted">
            Repair and diagnostic videos. Each video stays hosted on YouTube; watch it here, or on YouTube with the
            related written guide alongside.
          </p>
          <YouTubeChannelLink href={settings.socialLinks?.youtube} className="self-start" />
          <SearchForm />
        </header>

        {notice}

        {page.items.length > 0 && (
          <ul className="grid gap-space-sm sm:grid-cols-2 lg:grid-cols-3">
            {page.items.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </ul>
        )}
        <Pagination basePath="/videos" page={page.page} pageCount={page.pageCount} />
      </div>
    </div>
  );
}
