import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LinkButton } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { JsonLd } from "@/components/content/JsonLd";
import { RelatedContent } from "@/components/content/RelatedContent";
import { catalogNotice } from "@/components/services/CatalogState";
import { StateNotice } from "@/components/ui/Section";
import { getCatalog, getFaultCodes, getGuides, getSettingsOrNull, getVideos } from "@/lib/data";
import { formatPrice } from "@/lib/models";
import { breadcrumbJsonLd, serviceJsonLd } from "@/lib/seo";
import { siteUrl } from "@/lib/env";

export const revalidate = 60;

/** Pre-render known services at build; other slugs are rendered on first request, then cached (ISR). */
export async function generateStaticParams() {
  const catalog = await getCatalog();
  return catalog.ok ? catalog.value.services.map((s) => ({ slug: s.slug })) : [];
}

async function find(slug: string) {
  const catalog = await getCatalog();
  if (!catalog.ok) return { catalog, service: null, category: null };
  const service = catalog.value.services.find((s) => s.slug === slug) ?? null;
  const category = service ? catalog.value.categories.find((c) => c.id === service.categoryId) ?? null : null;
  return { catalog, service, category };
}

export async function generateMetadata({ params }: PageProps<"/services/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { service } = await find(slug);
  if (!service) return { title: "Service", robots: { index: false } };
  const title = service.seoTitle || service.name;
  const description = service.seoDescription || service.summary;
  return {
    title,
    description,
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      images: service.image ? [service.image] : undefined,
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function ServicePage({ params }: PageProps<"/services/[slug]">) {
  const { slug } = await params;
  const { catalog, service, category } = await find(slug);

  if (!catalog.ok) {
    return (
      <div className="px-gutter py-space-xl">
        <div className="mx-auto max-w-3xl">{catalogNotice(catalog)}</div>
      </div>
    );
  }
  if (!service) notFound();

  const base = siteUrl();
  const [settings, guidesResult, faultCodesResult, videosResult] = await Promise.all([
    getSettingsOrNull(),
    getGuides(),
    getFaultCodes(),
    getVideos(),
  ]);
  const relatedGuides = guidesResult.ok ? guidesResult.value.filter((g) => g.relatedServiceIds?.includes(service.id)) : [];
  const relatedFaultCodes = faultCodesResult.ok
    ? faultCodesResult.value.filter((f) => f.relatedServiceIds?.includes(service.id))
    : [];
  const relatedVideos = videosResult.ok ? videosResult.value.filter((v) => v.relatedServiceIds?.includes(service.id)) : [];

  const crumbs = [
    { name: "Home", url: base },
    { name: "Services", url: `${base}/services` },
    { name: service.name, url: `${base}/services/${service.slug}` },
  ];
  const paragraphs = (service.body ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className="px-gutter py-space-xl">
      <JsonLd data={serviceJsonLd(service, base, settings)} />
      <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ name: c.name, url: c.url })))} />
      <div className="mx-auto grid max-w-7xl gap-space-xl lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="flex max-w-3xl flex-col gap-space-md">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Services", href: "/services" },
              ...(category ? [{ name: category.name, href: `/services#${category.slug}` }] : []),
              { name: service.name, href: `/services/${service.slug}` },
            ]}
          />
          <h1 className="font-headline text-headline-xl-mobile text-text-primary md:text-headline-xl">{service.name}</h1>
          <p className="text-body-lg text-text-muted">{service.summary}</p>
          {paragraphs.map((p, i) => (
            <p key={i} className="text-body-md text-text-primary">{p}</p>
          ))}

          {(relatedGuides.length > 0 || relatedFaultCodes.length > 0 || relatedVideos.length > 0) && (
            <RelatedContent
              channelUrl={settings.socialLinks?.youtube}
              guides={relatedGuides}
              faultCodes={relatedFaultCodes}
              videos={relatedVideos}
            />
          )}
        </article>
        <aside className="h-fit rounded border border-border-subtle bg-surface-raised p-space-lg lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
          <dl className="flex flex-col gap-space-md">
            <div>
              <dt className="text-body-sm text-text-muted">Price</dt>
              <dd className="font-headline text-headline-md text-text-primary">{formatPrice(service)}</dd>
            </div>
            {service.estimatedMinutes && (
              <div>
                <dt className="text-body-sm text-text-muted">Estimated time</dt>
                <dd className="font-code text-body-lg text-text-primary">{service.estimatedMinutes} minutes</dd>
              </div>
            )}
          </dl>
          {service.bookable ? (
            <LinkButton href={`/book?service=${encodeURIComponent(service.slug)}`} className="mt-space-lg w-full">
              Book this service
            </LinkButton>
          ) : (
            <div className="mt-space-lg">
              <StateNotice title="Not bookable online">Contact the workshop to arrange this service.</StateNotice>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
