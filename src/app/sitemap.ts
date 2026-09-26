import type { MetadataRoute } from "next";
import { categoriesWithContent } from "@/lib/content";
import { getCatalog, getKnowledgeContent } from "@/lib/data";
import { siteUrl, workshopFeaturesEnabled } from "@/lib/env";

export const revalidate = 3600;

/**
 * Published, indexable content only. Excludes drafts/archived (never loaded), admin,
 * search results, noindex guides, and guides whose canonical URL points elsewhere.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const entries: MetadataRoute.Sitemap = ["", "/guides", "/fault-codes", "/videos", "/categories", "/about", "/contact"].map(
    (p) => ({ url: `${base}${p}` }),
  );

  const content = await getKnowledgeContent();
  for (const g of content.guides) {
    if (g.noindex || g.canonicalUrl) continue;
    entries.push({ url: `${base}/guides/${g.slug}`, lastModified: g.updatedAt ?? g.publishedAt });
  }
  for (const c of content.faultCodes) {
    entries.push({ url: `${base}/fault-codes/${c.code.toLowerCase()}`, lastModified: c.updatedAt });
  }
  for (const v of content.videos) {
    entries.push({ url: `${base}/videos/${v.slug}`, lastModified: v.updatedAt ?? v.publishedAt });
  }
  for (const { category } of categoriesWithContent(content.categories, content)) {
    entries.push({ url: `${base}/categories/${category.slug}` });
  }

  // Dormant workshop features (off by default): only listed when explicitly enabled.
  if (workshopFeaturesEnabled()) {
    entries.push({ url: `${base}/services` }, { url: `${base}/book` });
    const catalog = await getCatalog();
    if (catalog.ok) for (const s of catalog.value.services) entries.push({ url: `${base}/services/${s.slug}` });
  }
  return entries;
}
