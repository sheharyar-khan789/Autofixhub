import type { Metadata } from "next";
import Link from "next/link";
import { FaultCodeCard } from "@/components/content/FaultCodeCard";
import { GuideCard } from "@/components/content/GuideCard";
import { SearchForm } from "@/components/content/SearchForm";
import { VideoCard } from "@/components/content/VideoCard";
import { YouTubeChannelLink } from "@/components/content/YouTubeChannelLink";
import { LinkButton } from "@/components/ui/Button";
import { StateNotice } from "@/components/ui/Section";
import { categoriesWithContent } from "@/lib/content";
import { getKnowledgeContent, getSettingsOrNull } from "@/lib/data";
import { searchContent } from "@/lib/search";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Search",
  // Result pages are thin and infinite: keep them out of the index, but let links be followed.
  robots: { index: false, follow: true },
  alternates: { canonical: "/search" },
};

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const [content, settings] = await Promise.all([getKnowledgeContent(), getSettingsOrNull()]);

  if (!query) {
    return (
      <div className="px-gutter py-space-xl">
        <div className="mx-auto flex max-w-3xl flex-col gap-space-lg">
          <header className="flex flex-col gap-space-sm">
            <h1 className="font-headline text-headline-xl-mobile text-text-primary md:text-headline-xl">Search</h1>
            <p className="text-body-lg text-text-muted">
              Search guides, fault codes and videos by fault code, symptom, part or vehicle.
            </p>
            <SearchForm />
          </header>
          <div className="flex flex-wrap gap-space-sm">
            <LinkButton href="/guides" variant="secondary">Browse guides</LinkButton>
            <LinkButton href="/fault-codes" variant="secondary">Browse fault codes</LinkButton>
            <LinkButton href="/videos" variant="secondary">Browse videos</LinkButton>
            <LinkButton href="/categories" variant="secondary">Browse categories</LinkButton>
          </div>
        </div>
      </div>
    );
  }

  // Only categories that have content are searchable, so a result never leads to an empty page.
  const categories = categoriesWithContent(content.categories, content).map((c) => c.category);
  const results = searchContent(query, { ...content, categories });

  return (
    <div className="px-gutter py-space-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-space-xl">
        <header className="flex max-w-3xl flex-col gap-space-sm">
          <h1 className="font-headline text-headline-xl-mobile text-text-primary md:text-headline-xl">Search</h1>
          <SearchForm defaultValue={query} />
          <p className="text-body-sm text-text-muted" role="status">
            {results.total} result{results.total === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
          </p>
        </header>

        {content.failed && (
          <StateNotice title="Some content could not be searched" tone="error">
            Part of the content could not be loaded. Refresh to try again.
          </StateNotice>
        )}

        {results.total === 0 ? (
          <StateNotice title="No results found">
            Try the fault code on its own (e.g. P0401), a vehicle make and model, or one word from the symptom.
            <span className="mt-space-sm flex flex-wrap items-center gap-space-md">
              <Link href="/categories" className="underline underline-offset-4">Browse categories</Link>
              <YouTubeChannelLink href={settings.socialLinks?.youtube} label="Search the YouTube channel" variant="ghost" className="!px-0 !py-0" />
            </span>
          </StateNotice>
        ) : (
          <div className="flex flex-col gap-space-xl">
            {results.categories.length > 0 && (
              <section className="flex flex-col gap-space-sm">
                <h2 className="font-headline text-headline-md text-text-primary">Categories</h2>
                <ul className="flex flex-wrap gap-space-sm">
                  {results.categories.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/categories/${c.slug}`}
                        className="inline-flex min-h-11 items-center rounded border border-border-medium bg-surface-card px-space-md font-code text-body-sm text-text-primary hover:border-text-muted"
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {results.guides.length > 0 && (
              <section className="flex flex-col gap-space-sm">
                <h2 className="font-headline text-headline-md text-text-primary">Repair guides</h2>
                <ul className="grid gap-space-sm sm:grid-cols-2 lg:grid-cols-3">
                  {results.guides.slice(0, 24).map((g) => (
                    <GuideCard key={g.id} guide={g} />
                  ))}
                </ul>
              </section>
            )}
            {results.faultCodes.length > 0 && (
              <section className="flex flex-col gap-space-sm">
                <h2 className="font-headline text-headline-md text-text-primary">Fault codes</h2>
                <ul className="grid gap-space-sm sm:grid-cols-2 lg:grid-cols-3">
                  {results.faultCodes.slice(0, 24).map((c) => (
                    <FaultCodeCard key={c.id} code={c} />
                  ))}
                </ul>
              </section>
            )}
            {results.videos.length > 0 && (
              <section className="flex flex-col gap-space-sm">
                <h2 className="font-headline text-headline-md text-text-primary">Videos</h2>
                <ul className="grid gap-space-sm sm:grid-cols-2 lg:grid-cols-3">
                  {results.videos.slice(0, 24).map((v) => (
                    <VideoCard key={v.id} video={v} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
