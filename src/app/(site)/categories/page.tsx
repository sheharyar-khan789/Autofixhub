import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { JsonLd } from "@/components/content/JsonLd";
import { YouTubeChannelLink } from "@/components/content/YouTubeChannelLink";
import { StateNotice } from "@/components/ui/Section";
import { categoriesWithContent, type CategoryWithCount } from "@/lib/content";
import { getKnowledgeContent, getSettingsOrNull } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { breadcrumbJsonLd } from "@/lib/seo";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Categories",
  description: "Browse repair guides, fault codes and videos by vehicle and by topic: diesel, hybrid, DPF, turbo, gearbox, wiring and more.",
  alternates: { canonical: "/categories" },
};

function Group({ title, items }: { title: string; items: CategoryWithCount[] }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-space-md" aria-labelledby={`${title}-h`}>
      <h2 id={`${title}-h`} className="font-headline text-headline-md text-text-primary">{title}</h2>
      <ul className="grid gap-space-sm sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ category, count }) => (
          <li key={category.id}>
            <Link
              href={`/categories/${category.slug}`}
              className="flex h-full flex-col gap-space-xs rounded border border-border-subtle bg-surface-raised p-space-md transition-colors hover:border-border-medium hover:bg-surface-card"
            >
              <span className="font-headline text-headline-sm text-text-primary">{category.name}</span>
              {category.description && <span className="text-body-sm text-text-muted">{category.description}</span>}
              <span className="mt-auto font-code text-label-telemetry text-text-muted">
                {count} {count === 1 ? "item" : "items"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function CategoriesPage() {
  const [content, settings] = await Promise.all([getKnowledgeContent(), getSettingsOrNull()]);
  const withContent = categoriesWithContent(content.categories, content);
  const base = siteUrl();
  return (
    <div className="px-gutter py-space-xl">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: base }, { name: "Categories", url: `${base}/categories` }])} />
      <div className="mx-auto flex max-w-7xl flex-col gap-space-xl">
        <header className="flex max-w-3xl flex-col gap-space-sm">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Categories", href: "/categories" }]} />
          <h1 className="font-headline text-headline-xl-mobile text-text-primary md:text-headline-xl">Categories</h1>
          <p className="text-body-lg text-text-muted">Browse guides, fault codes and videos by vehicle or by topic.</p>
        </header>
        {content.failed && (
          <StateNotice title="Some content could not be loaded" tone="error">
            Refresh the page to try again.
          </StateNotice>
        )}
        {withContent.length === 0 ? (
          <StateNotice title="No categories to show yet">
            Categories appear here as soon as guides, fault codes or videos are published in them.
            <span className="mt-space-sm flex flex-wrap gap-space-md">
              <Link href="/fault-codes" className="underline underline-offset-4">Fault code database</Link>
              <YouTubeChannelLink href={settings.socialLinks?.youtube} variant="ghost" className="!px-0 !py-0" />
            </span>
          </StateNotice>
        ) : (
          <>
            <Group title="Vehicles" items={withContent.filter((c) => c.category.kind === "vehicle")} />
            <Group title="Topics" items={withContent.filter((c) => c.category.kind === "topic")} />
          </>
        )}
      </div>
    </div>
  );
}
