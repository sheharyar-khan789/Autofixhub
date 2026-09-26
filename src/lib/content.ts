import type { ContentCategory, FaultCode, Guide, Video } from "@/lib/models";

/**
 * Pure helpers for the knowledge platform: category membership, related content and
 * pagination. No I/O here, so every rule is unit-tested (tests/unit/content-engine.test.ts).
 */

export interface PublishedContent {
  guides: Guide[];
  faultCodes: FaultCode[];
  videos: Video[];
}

const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase();
const overlap = (a: readonly string[] | undefined, b: readonly string[] | undefined) =>
  (a ?? []).filter((x) => (b ?? []).includes(x)).length;

/** Items tagged with a category slug. */
export function itemsInCategory(slug: string, content: PublishedContent): PublishedContent {
  const has = (slugs: string[] | undefined) => (slugs ?? []).includes(slug);
  return {
    guides: content.guides.filter((g) => has(g.categorySlugs)),
    faultCodes: content.faultCodes.filter((f) => has(f.categorySlugs)),
    videos: content.videos.filter((v) => has(v.categorySlugs)),
  };
}

export interface CategoryWithCount {
  category: ContentCategory;
  count: number;
}

/** Only categories that actually have published content, so no empty category pages are exposed. */
export function categoriesWithContent(categories: ContentCategory[], content: PublishedContent): CategoryWithCount[] {
  return categories
    .map((category) => {
      const items = itemsInCategory(category.slug, content);
      return { category, count: items.guides.length + items.faultCodes.length + items.videos.length };
    })
    .filter((c) => c.count > 0);
}

/**
 * Related guides, strongest signal first: explicitly linked guides, then guides that
 * share fault codes, categories, make/model or system. Never random: a guide with no
 * shared signal is not recommended.
 */
export function relatedGuides(guide: Guide, all: Guide[], limit = 4): Guide[] {
  const explicit = new Set(guide.relatedGuideSlugs ?? []);
  const scored = all
    .filter((g) => g.slug !== guide.slug)
    .map((g) => {
      let score = 0;
      if (explicit.has(g.slug)) score += 100;
      if ((g.relatedGuideSlugs ?? []).includes(guide.slug)) score += 50;
      score += 10 * overlap(g.relatedFaultCodes, guide.relatedFaultCodes);
      score += 5 * overlap(g.categorySlugs, guide.categorySlugs);
      if (guide.vehicleMake && norm(g.vehicleMake) === norm(guide.vehicleMake)) {
        score += 3;
        if (guide.vehicleModel && norm(g.vehicleModel) === norm(guide.vehicleModel)) score += 4;
      }
      if (guide.problemCategory && norm(g.problemCategory) === norm(guide.problemCategory)) score += 4;
      return { g, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.g.publishedAt ?? "").localeCompare(a.g.publishedAt ?? ""));
  return scored.slice(0, limit).map((x) => x.g);
}

/** Other codes in the same system or category (never a random selection). */
export function relatedFaultCodes(code: FaultCode, all: FaultCode[], limit = 6): FaultCode[] {
  return all
    .filter((c) => c.code !== code.code)
    .map((c) => ({
      c,
      score:
        (code.system && norm(c.system) === norm(code.system) ? 5 : 0) + 2 * overlap(c.categorySlugs, code.categorySlugs),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.c.code.localeCompare(b.c.code))
    .slice(0, limit)
    .map((x) => x.c);
}

/** Guides that reference a fault code, or are linked from it. */
export function guidesForFaultCode(code: FaultCode, guides: Guide[]): Guide[] {
  const linked = new Set(code.relatedGuideSlugs ?? []);
  return guides.filter((g) => linked.has(g.slug) || (g.relatedFaultCodes ?? []).includes(code.code));
}

/** Videos that reference a fault code, or are linked from it. */
export function videosForFaultCode(code: FaultCode, videos: Video[]): Video[] {
  const linked = new Set(code.relatedVideoIds ?? []);
  return videos.filter((v) => linked.has(v.id) || (v.relatedFaultCodes ?? []).includes(code.code));
}

/** Videos linked to a guide in either direction. */
export function videosForGuide(guide: Guide, videos: Video[]): Video[] {
  const linked = new Set(guide.relatedVideoIds ?? []);
  return videos.filter((v) => linked.has(v.id) || v.relatedGuideSlug === guide.slug);
}

export interface Page<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
}

export const PAGE_SIZE = 12;

/** 1-based pagination; an out-of-range or invalid page clamps to the nearest valid one. */
export function paginate<T>(items: T[], rawPage: unknown, size = PAGE_SIZE): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const n = typeof rawPage === "string" ? Number.parseInt(rawPage, 10) : Number.NaN;
  const page = Number.isFinite(n) ? Math.min(Math.max(1, n), pageCount) : 1;
  return { items: items.slice((page - 1) * size, page * size), page, pageCount, total: items.length };
}
