import type { ContentCategory, FaultCode, Guide, Video } from "@/lib/models";

/**
 * Server-side search over already-loaded published content (no external search
 * service). Every word of the query must match somewhere in the item; items whose
 * title/code match rank first. Matching is case-insensitive and ignores punctuation,
 * so "vw diesel", "P0401" and "prius hybrid" all behave as expected.
 */

/** Common shorthand people type, expanded to the words used in content. */
const SYNONYMS: Record<string, string[]> = {
  vw: ["volkswagen"],
  volkswagen: ["vw"],
  tdi: ["diesel"],
  egr: ["exhaust gas recirculation"],
  dpf: ["particulate"],
  loom: ["wiring"],
};

export function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 0)
    .slice(0, 8);
}

function haystack(parts: (string | undefined | null)[]): string {
  return ` ${parts.filter(Boolean).join(" ").toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
}

function termMatches(text: string, term: string): boolean {
  if (text.includes(term)) return true;
  return (SYNONYMS[term] ?? []).some((alt) => text.includes(alt));
}

/** 0 = no match; higher = better. All terms must match the full text. */
function score(terms: string[], title: string, full: string): number {
  if (terms.length === 0) return 0;
  if (!terms.every((t) => termMatches(full, t))) return 0;
  return 1 + terms.filter((t) => termMatches(title, t)).length;
}

function rank<T>(items: T[], terms: string[], title: (i: T) => string, full: (i: T) => string): T[] {
  return items
    .map((item) => ({ item, s: score(terms, haystack([title(item)]), haystack([full(item)])) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.item);
}

export interface SearchResults {
  guides: Guide[];
  faultCodes: FaultCode[];
  videos: Video[];
  categories: ContentCategory[];
  total: number;
}

export function searchContent(
  query: string,
  content: { guides: Guide[]; faultCodes: FaultCode[]; videos: Video[]; categories: ContentCategory[] },
): SearchResults {
  const terms = tokenize(query);
  const guides = rank(
    content.guides,
    terms,
    (g) => g.title,
    (g) =>
      [
        g.title, g.excerpt, g.content, g.vehicleMake, g.vehicleModel, g.vehicleGeneration, g.engine, g.fuelType,
        g.problemCategory, g.diagnosis, g.repairInfo, ...(g.symptoms ?? []), ...(g.possibleCauses ?? []),
        ...(g.relatedFaultCodes ?? []), ...(g.categorySlugs ?? []),
      ].join(" "),
  );
  const faultCodes = rank(
    content.faultCodes,
    terms,
    (f) => `${f.code} ${f.title}`,
    (f) =>
      [f.code, f.title, f.meaning, f.system, ...(f.relatedVehicles ?? []), ...(f.symptoms ?? []), ...(f.possibleCauses ?? []),
        ...(f.categorySlugs ?? [])].join(" "),
  );
  const videos = rank(
    content.videos,
    terms,
    (v) => v.title,
    (v) =>
      [v.title, v.description, v.vehicleMake, v.vehicleModel, v.category, ...(v.relatedFaultCodes ?? []),
        ...(v.categorySlugs ?? [])].join(" "),
  );
  const categories = rank(content.categories, terms, (c) => c.name, (c) => `${c.name} ${c.slug} ${c.description ?? ""}`);
  return { guides, faultCodes, videos, categories, total: guides.length + faultCodes.length + videos.length + categories.length };
}
