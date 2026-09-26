import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/content/Breadcrumbs";
import { faultCodesNotice } from "@/components/content/ContentState";
import { JsonLd } from "@/components/content/JsonLd";
import { RelatedContent } from "@/components/content/RelatedContent";
import { StateNotice } from "@/components/ui/Section";
import { guidesForFaultCode, relatedFaultCodes, videosForFaultCode } from "@/lib/content";
import { getFaultCode, getFaultCodes, getKnowledgeContent, getSettingsOrNull } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { breadcrumbJsonLd, faultCodeJsonLd } from "@/lib/seo";

export const revalidate = 60;

export async function generateStaticParams() {
  const codes = await getFaultCodes();
  return codes.ok ? codes.value.map((c) => ({ code: c.code.toLowerCase() })) : [];
}

export async function generateMetadata({ params }: PageProps<"/fault-codes/[code]">): Promise<Metadata> {
  const { code } = await params;
  const result = await getFaultCode(code);
  if (!result.ok || !result.value) return { title: "Fault code", robots: { index: false } };
  const c = result.value;
  const title = c.seoTitle || `${c.code} – ${c.title}`;
  const description = c.seoDescription || c.meaning.slice(0, 155);
  return {
    title,
    description,
    alternates: { canonical: `/fault-codes/${c.code.toLowerCase()}` },
    openGraph: { type: "article", title, description },
    twitter: { card: "summary", title, description },
  };
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

export default async function FaultCodePage({ params }: PageProps<"/fault-codes/[code]">) {
  const { code } = await params;
  const result = await getFaultCode(code);

  if (!result.ok) {
    return (
      <div className="px-gutter py-space-xl">
        <div className="mx-auto max-w-3xl">{faultCodesNotice(result)}</div>
      </div>
    );
  }
  const faultCode = result.value;
  if (!faultCode) notFound();

  const base = siteUrl();
  const [content, settings] = await Promise.all([getKnowledgeContent(), getSettingsOrNull()]);
  const guides = guidesForFaultCode(faultCode, content.guides);
  const videos = videosForFaultCode(faultCode, content.videos);
  const codes = relatedFaultCodes(faultCode, content.faultCodes);
  const categories = content.categories.filter((c) => faultCode.categorySlugs?.includes(c.slug));
  const path = `/fault-codes/${faultCode.code.toLowerCase()}`;

  return (
    <div className="px-gutter py-space-xl">
      <JsonLd data={faultCodeJsonLd(faultCode, base)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: base },
          { name: "Fault codes", url: `${base}/fault-codes` },
          { name: faultCode.code, url: `${base}${path}` },
        ])}
      />
      <div className="mx-auto grid max-w-7xl gap-space-xl lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="flex max-w-3xl flex-col gap-space-lg">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Fault codes", href: "/fault-codes" },
              { name: faultCode.code, href: path },
            ]}
          />
          <header className="flex flex-col gap-space-sm">
            <span className="font-code text-label-code font-bold text-status-fault-red">
              {faultCode.code}
              {faultCode.system ? <span className="ml-space-sm font-normal text-text-muted">{faultCode.system}</span> : null}
            </span>
            <h1 className="font-headline text-headline-xl-mobile text-text-primary md:text-headline-xl">{faultCode.title}</h1>
          </header>

          {faultCode.scope === "generic" ? (
            <StateNotice title="Generic OBD-II code">
              This is a generic definition. The exact cause can vary between makes and models: use it as a starting
              point, not a confirmed diagnosis for your vehicle.
            </StateNotice>
          ) : (
            <StateNotice title="Manufacturer-specific code">
              {faultCode.relatedVehicles?.length
                ? `This explanation is written for: ${faultCode.relatedVehicles.join(", ")}. It may not apply to other vehicles.`
                : "This explanation is written for specific vehicles and may not apply to others."}
            </StateNotice>
          )}

          <section className="flex flex-col gap-space-xs">
            <h2 className="font-headline text-headline-sm text-text-primary">What it means</h2>
            <p className="text-body-md text-text-primary">{faultCode.meaning}</p>
            <p className="mt-space-xs rounded-md border-l-2 border-status-amber-warning bg-surface-raised px-space-md py-space-sm text-body-sm text-text-muted">
              A fault code is a starting point for diagnosis. It does not prove that a specific component has failed: confirm
              the cause with testing before replacing parts.
            </p>
          </section>

          <ListSection title="Symptoms" items={faultCode.symptoms} />
          <ListSection title="Possible causes" items={faultCode.possibleCauses} />
          <ListSection title="Diagnostic direction" items={faultCode.diagnosticSteps} ordered />

          {faultCode.notes?.length ? (
            <StateNotice title="Important notes" tone="error">
              <ul className="list-disc pl-space-lg">
                {faultCode.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </StateNotice>
          ) : null}

          {faultCode.scope === "generic" && faultCode.relatedVehicles && faultCode.relatedVehicles.length > 0 && (
            <section className="flex flex-col gap-space-xs">
              <h2 className="font-headline text-headline-sm text-text-primary">Seen on</h2>
              <p className="text-body-md text-text-muted">{faultCode.relatedVehicles.join(", ")}</p>
            </section>
          )}
        </article>

        <aside className="h-fit lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
          <RelatedContent
            guides={guides}
            guidesTitle="Guides for this code"
            videos={videos}
            faultCodes={codes}
            categories={categories}
            channelUrl={settings.socialLinks?.youtube}
          />
        </aside>
      </div>
    </div>
  );
}
