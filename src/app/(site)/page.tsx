import type { Metadata } from "next";
import { HomeHero } from "@/components/home/HomeHero";
import {
  AboutAutoFixHub,
  FaultCodeSection,
  FinalCta,
  HomeSearch,
  LatestGuides,
  LatestVideos,
  VehicleCategories,
} from "@/components/home/KnowledgeHome";
import { JsonLd } from "@/components/content/JsonLd";
import { CONFIRMED_BUSINESS } from "@/lib/business";
import { categoriesWithContent } from "@/lib/content";
import { getKnowledgeContent, getSettingsOrNull } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { autoRepairJsonLd, organizationJsonLd } from "@/lib/seo";

export const revalidate = 60;
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const [settings, content] = await Promise.all([getSettingsOrNull(), getKnowledgeContent()]);
  const withContent = categoriesWithContent(content.categories, content);
  const topics = withContent.filter((c) => c.category.kind === "topic");
  const vehicles = withContent.filter((c) => c.category.kind === "vehicle");
  const youtube = settings.socialLinks?.youtube;
  // LocalBusiness markup needs a verified address; until then describe the organisation only.
  const jsonLd =
    autoRepairJsonLd(settings, siteUrl()) ?? organizationJsonLd(settings, siteUrl(), CONFIRMED_BUSINESS.locality);
  return (
    <>
      <JsonLd data={jsonLd} />
      <HomeHero settings={settings} />
      {/* Chapters: search, guides, diagnostics, vehicles, video, about, closing call to action. */}
      <HomeSearch topics={topics.length > 0 ? topics : withContent} />
      <LatestGuides guides={content.guides} youtube={youtube} />
      <FaultCodeSection codes={content.faultCodes} />
      <VehicleCategories vehicles={vehicles} />
      <LatestVideos videos={content.videos} youtube={youtube} />
      <AboutAutoFixHub settings={settings} />
      <FinalCta settings={settings} />
    </>
  );
}
