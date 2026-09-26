import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { FaultCodeCard } from "@/components/content/FaultCodeCard";
import { GuideCard } from "@/components/content/GuideCard";
import { JsonLd } from "@/components/content/JsonLd";
import { VideoCard } from "@/components/content/VideoCard";
import { YouTubeChannelLink } from "@/components/content/YouTubeChannelLink";
import { categoriesWithContent, itemsInCategory } from "@/lib/content";
import { getKnowledgeContent, getSettingsOrNull } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { breadcrumbJsonLd } from "@/lib/seo";

export const revalidate = 60;

/** A category page exists only while it is published and has published content. */
async function loadCategory(slug: string) {
  const content = await getKnowledgeContent();
  const match = categoriesWithContent(content.categories, content).find((c) => c.category.slug === slug);
  if (!match) return null;
  return { category: match.category, items: itemsInCategory(slug, content) };
}

export async function generateStaticParams() {
  const content = await getKnowledgeContent();
  return categoriesWithContent(content.categories, content).map((c) => ({ slug: c.category.slug }));
}

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadCategory(slug);
  if (!data) return { title: "Category", robots: { index: false } };
  const c = data.category;
  const title = c.seoTitle || `${c.name}: guides, fault codes and videos`;
  const description = c.seoDescription || c.description || `Repair guides, fault codes and videos about ${c.name}.`;
  return {
    title,
    description,
    alternates: { canonical: `/categories/${c.slug}` },
    openGraph: { type: "website", title, description },
  };
}

export default async function CategoryPage({ params }: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const [data, settings] = await Promise.all([loadCategory(slug), getSettingsOrNull()]);
  if (!data) notFound();
  const { category, items } = data;
  const base = siteUrl();

  return (
    <div className="px-gutter py-space-xl">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: base },
          { name: "Categories", url: `${base}/categories` },
          { name: category.name, url: `${base}/categories/${category.slug}` },
        ])}
      />
      <div className="mx-auto flex max-w-7xl flex-col gap-space-xl">
        <header className="flex max-w-3xl flex-col gap-space-sm">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Categories", href: "/categories" },
              { name: category.name, href: `/categories/${category.slug}` },
            ]}
          />
          <h1 className="font-headline text-headline-xl-mobile text-text-primary md:text-headline-xl">{category.name}</h1>
          {category.description && <p className="text-body-lg text-text-muted">{category.description}</p>}
        </header>

        {items.guides.length > 0 && (
          <section className="flex flex-col gap-space-sm" aria-labelledby="cat-guides">
            <h2 id="cat-guides" className="font-headline text-headline-md text-text-primary">Guides</h2>
            <ul className="grid gap-space-sm sm:grid-cols-2 lg:grid-cols-3">
              {items.guides.map((g) => (
                <GuideCard key={g.id} guide={g} />
              ))}
            </ul>
          </section>
        )}
        {items.faultCodes.length > 0 && (
          <section className="flex flex-col gap-space-sm" aria-labelledby="cat-codes">
            <h2 id="cat-codes" className="font-headline text-headline-md text-text-primary">Fault codes</h2>
            <ul className="grid gap-space-sm sm:grid-cols-2 lg:grid-cols-3">
              {items.faultCodes.map((c) => (
                <FaultCodeCard key={c.id} code={c} />
              ))}
            </ul>
          </section>
        )}
        {items.videos.length > 0 && (
          <section className="flex flex-col gap-space-sm" aria-labelledby="cat-videos">
            <h2 id="cat-videos" className="font-headline text-headline-md text-text-primary">Videos</h2>
            <ul className="grid gap-space-sm sm:grid-cols-2 lg:grid-cols-3">
              {items.videos.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </ul>
          </section>
        )}
        <div>
          <YouTubeChannelLink href={settings.socialLinks?.youtube} label="More videos on YouTube" />
        </div>
      </div>
    </div>
  );
}
