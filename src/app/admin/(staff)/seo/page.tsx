import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { isNotConfigured, siteUrl } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import { categoriesConfig, faultCodesConfig, guidesConfig, listAllAdmin, videosConfig } from "@/lib/admin/content";
import { itemsInCategory } from "@/lib/content";
import { EmptyState, ErrorState, PageHeader, StatCard, cardClass, secondaryBtn } from "../../_components/ui";

export const dynamic = "force-dynamic";

interface Issue {
  label: string;
  href: string;
}

function IssueList({ title, hint, items }: { title: string; hint: string; items: Issue[] }) {
  return (
    <section className={`${cardClass} flex flex-col gap-space-sm`}>
      <div className="flex items-baseline justify-between gap-space-sm">
        <h2 className="font-headline text-headline-sm text-text-primary">{title}</h2>
        <span className={`font-code text-label-code tabular-nums ${items.length ? "text-status-amber-warning" : "text-status-pass-green"}`}>{items.length}</span>
      </div>
      <p className="text-body-sm text-text-muted">{hint}</p>
      {items.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {items.slice(0, 12).map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="text-body-sm text-text-primary underline-offset-2 hover:underline">{i.label}</Link>
            </li>
          ))}
          {items.length > 12 && <li className="text-body-sm text-text-muted">…and {items.length - 12} more</li>}
        </ul>
      ) : (
        <p className="text-body-sm text-status-pass-green">Nothing to fix.</p>
      )}
    </section>
  );
}

/**
 * SEO health from real content only (no rankings or traffic: there is no Search
 * Console integration). Flags published items missing the fields search engines use.
 */
export default async function SeoPage() {
  await requireRole(CONTENT_ROLES);
  const base = siteUrl();
  let data: Awaited<ReturnType<typeof load>> | null = null;
  let failure: "not-configured" | "error" | null = null;
  try {
    data = await load();
  } catch (err) {
    failure = isNotConfigured(err) ? "not-configured" : "error";
    if (failure === "error") logServerError("admin.seo", err);
  }

  return (
    <>
      <PageHeader
        title="SEO"
        description="Checks on published content. Fixing these improves how pages appear in search results; it does not guarantee rankings."
        breadcrumbs={[{ name: "Dashboard", href: "/admin" }, { name: "SEO" }]}
        action={
          <>
            <a href="/sitemap.xml" target="_blank" className={secondaryBtn}>Sitemap<span className="sr-only"> (opens in a new tab)</span></a>
            <a href="/robots.txt" target="_blank" className={secondaryBtn}>robots.txt<span className="sr-only"> (opens in a new tab)</span></a>
          </>
        }
      />
      <p className="text-body-sm text-text-muted">
        Site URL used for canonical links and the sitemap: <code className="font-code text-text-primary">{base}</code>
        {base.startsWith("http://localhost") && " (set NEXT_PUBLIC_SITE_URL to the real domain in production)"}
      </p>
      {failure === "not-configured" ? (
        <EmptyState title="Firebase isn't connected here">Content can&apos;t be checked in this environment.</EmptyState>
      ) : failure === "error" || !data ? (
        <ErrorState retryHref="/admin/seo">Content couldn&apos;t be loaded for the SEO check.</ErrorState>
      ) : (
        <>
          <section aria-label="Indexable pages" className="grid grid-cols-2 gap-space-sm md:grid-cols-4">
            <StatCard label="Indexable guides" value={data.indexableGuides} />
            <StatCard label="Fault code pages" value={data.faultCodePages} />
            <StatCard label="Video pages" value={data.videoPages} />
            <StatCard label="Category pages" value={data.categoryPages} />
          </section>
          <div className="grid gap-space-md md:grid-cols-2">
            <IssueList title="Guides without an SEO title" hint="The page title falls back to the guide title. A specific title (≤ 70 characters) usually reads better in results." items={data.noSeoTitle} />
            <IssueList title="Guides without a meta description" hint="The summary is used instead. A written description (≤ 160 characters) controls the search snippet." items={data.noSeoDescription} />
            <IssueList title="Guides without a share image" hint="Links shared on social media show no preview image." items={data.noImage} />
            <IssueList title="Guides hidden from search (noindex)" hint="Published but deliberately kept out of search engines and the sitemap." items={data.noindex} />
            <IssueList title="Guides with a custom canonical URL" hint="Search engines are told the original lives elsewhere; these are left out of the sitemap." items={data.canonical} />
            <IssueList title="Published categories with no content" hint="Their public page stays hidden (404) until something published is tagged with them." items={data.emptyCategories} />
          </div>
        </>
      )}
    </>
  );
}

async function load() {
  const [guides, faultCodes, videos, categories] = await Promise.all([
    listAllAdmin(guidesConfig),
    listAllAdmin(faultCodesConfig),
    listAllAdmin(videosConfig),
    listAllAdmin(categoriesConfig),
  ]);
  const pub = <T extends { status: string }>(xs: T[]) => xs.filter((x) => x.status === "published");
  const g = pub(guides);
  const published = { guides: g, faultCodes: pub(faultCodes), videos: pub(videos) };
  const edit = (id: string) => `/admin/guides/${id}`;
  const pubCats = pub(categories);
  const withContent = pubCats.filter((c) => {
    const i = itemsInCategory(c.slug, published);
    return i.guides.length + i.faultCodes.length + i.videos.length > 0;
  });
  return {
    indexableGuides: g.filter((x) => !x.noindex && !x.canonicalUrl).length,
    faultCodePages: published.faultCodes.length,
    videoPages: published.videos.length,
    categoryPages: withContent.length,
    noSeoTitle: g.filter((x) => !x.seoTitle).map((x) => ({ label: x.title, href: edit(x.id) })),
    noSeoDescription: g.filter((x) => !x.seoDescription).map((x) => ({ label: x.title, href: edit(x.id) })),
    noImage: g.filter((x) => !x.featuredImage && !x.ogImage).map((x) => ({ label: x.title, href: edit(x.id) })),
    noindex: g.filter((x) => x.noindex).map((x) => ({ label: x.title, href: edit(x.id) })),
    canonical: g.filter((x) => x.canonicalUrl).map((x) => ({ label: x.title, href: edit(x.id) })),
    emptyCategories: pubCats.filter((c) => !withContent.includes(c)).map((c) => ({ label: c.name, href: `/admin/categories/${c.id}` })),
  };
}
