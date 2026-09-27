import type { BusinessSettings, FaqEntry, FaultCode, Guide, Service, Video } from "@/lib/models";
import { youtubeThumbnail } from "@/lib/models";
import { formatAddress } from "@/lib/contact";

const SCHEMA_DAYS: Record<string, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
};

/**
 * schema.org AutoRepair. Built only from real settings: returns null (no
 * markup at all) until the business has supplied a name and an address.
 * Deliberately excludes AggregateRating/Review for the business's own reviews.
 */
export function autoRepairJsonLd(s: BusinessSettings | null, baseUrl?: string) {
  if (!s?.tradingName || !s.address) return null;
  return {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    name: s.tradingName,
    ...(baseUrl ? { url: baseUrl } : {}),
    ...(s.phone ? { telephone: s.phone } : {}),
    ...(s.email ? { email: s.email } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: [s.address.line1, s.address.line2].filter(Boolean).join(", "),
      addressLocality: s.address.city,
      postalCode: s.address.postcode,
      addressCountry: "GB",
    },
    ...(s.openingHours?.length
      ? {
          openingHoursSpecification: s.openingHours
            .filter((h) => !h.closed && h.open && h.close)
            .map((h) => ({
              "@type": "OpeningHoursSpecification",
              dayOfWeek: SCHEMA_DAYS[h.day],
              opens: h.open,
              closes: h.close,
            })),
        }
      : {}),
    ...(sameAs(s).length ? { sameAs: sameAs(s) } : {}),
    description: `Vehicle diagnostics and repairs at ${formatAddress(s.address)}.`,
  };
}

/** Public profile URLs (YouTube etc.) that are set in settings. */
function sameAs(s: BusinessSettings): string[] {
  return Object.values(s.socialLinks ?? {}).filter((u): u is string => typeof u === "string" && u.length > 0);
}

/**
 * schema.org Organization, used until a verified street address exists (AutoRepair
 * needs one). Only confirmed facts: name, site, email, public profiles, and the
 * confirmed town. No phone, hours, ratings, prices or certifications.
 */
export function organizationJsonLd(s: BusinessSettings | null, baseUrl: string, locality?: string) {
  if (!s?.tradingName) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: s.tradingName,
    url: baseUrl,
    ...(s.email ? { email: s.email } : {}),
    ...(sameAs(s).length ? { sameAs: sameAs(s) } : {}),
    ...(locality
      ? { address: { "@type": "PostalAddress", addressLocality: locality, addressCountry: "GB" } }
      : {}),
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/** BreadcrumbList for any page; pass absolute URLs. Returns null for fewer than 2 crumbs. */
export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  if (items.length < 2) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * schema.org Service for a single service page. `provider` is only included
 * once the business has supplied a verified name and address, same rule as
 * autoRepairJsonLd.
 */
export function serviceJsonLd(service: Service, baseUrl: string, settings: BusinessSettings | null) {
  const provider =
    settings?.tradingName && settings.address
      ? {
          "@type": "AutoRepair",
          name: settings.tradingName,
          address: {
            "@type": "PostalAddress",
            streetAddress: [settings.address.line1, settings.address.line2].filter(Boolean).join(", "),
            addressLocality: settings.address.city,
            postalCode: settings.address.postcode,
            addressCountry: "GB",
          },
        }
      : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: service.name,
    name: service.name,
    description: service.summary,
    url: `${baseUrl}/services/${service.slug}`,
    areaServed: settings?.address?.city,
    provider,
  };
}

function absoluteImage(image: string | undefined, baseUrl: string): string | undefined {
  if (!image) return undefined;
  return image.startsWith("http") ? image : `${baseUrl}${image.startsWith("/") ? "" : "/"}${image}`;
}

/** schema.org Article for a repair guide. Only uses facts actually on the record. */
export function guideArticleJsonLd(guide: Guide, baseUrl: string, publisherName?: string) {
  const url = `${baseUrl}/guides/${guide.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.seoDescription || guide.excerpt,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: absoluteImage(guide.featuredImage ?? guide.ogImage, baseUrl),
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt ?? guide.publishedAt,
    author: guide.author ? { "@type": "Person", name: guide.author } : undefined,
    publisher: publisherName ? { "@type": "Organization", name: publisherName, url: baseUrl } : undefined,
  };
}

/**
 * schema.org TechArticle for a fault-code reference page. Not "Article", since
 * this is a technical diagnostic reference rather than editorial writing.
 */
export function faultCodeJsonLd(code: FaultCode, baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `${code.code} \u2013 ${code.title}`,
    description: code.seoDescription || code.meaning,
    url: `${baseUrl}/fault-codes/${code.code.toLowerCase()}`,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${baseUrl}/fault-codes/${code.code.toLowerCase()}` },
    dateModified: code.updatedAt,
  };
}

/**
 * A search-result description from free text (e.g. a pasted YouTube description): one
 * line, no hashtags, cut at a word boundary to about the length Google shows.
 */
export function metaDescription(text: string, max = 155): string {
  const clean = text
    .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > max * 0.6 ? cut.lastIndexOf(" ") : cut.length).replace(/[\s,;:.!?–-]+$/, "")}…`;
}

/** schema.org VideoObject. The video stays hosted on YouTube; this only describes it with real metadata. */
export function videoObjectJsonLd(video: Video, baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: video.title,
    description: video.description || video.title,
    thumbnailUrl: [absoluteImage(video.thumbnail, baseUrl) ?? youtubeThumbnail(video.youtubeVideoId)],
    // The YouTube upload date as entered by the author. This site's own publish date is never used.
    uploadDate: video.uploadDate,
    duration: video.duration,
    embedUrl: `https://www.youtube-nocookie.com/embed/${video.youtubeVideoId}`,
    contentUrl: video.youtubeUrl,
    url: `${baseUrl}/videos/${video.slug}`,
  };
}

/** schema.org FAQPage. Returns null when there is no real FAQ content, per Google's guidance. */
export function faqJsonLd(faqs: FaqEntry[] | undefined) {
  if (!faqs || faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}
