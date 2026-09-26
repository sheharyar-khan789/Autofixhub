import { describe, expect, it } from "vitest";
import {
  categoriesWithContent,
  guidesForFaultCode,
  itemsInCategory,
  paginate,
  relatedFaultCodes,
  relatedGuides,
  videosForGuide,
} from "@/lib/content";
import { formatFaqs, parseCheckboxes, parseFaqs } from "@/lib/admin/forms";
import { contentCategorySchema, faultCodeSchema, guideSchema, videoSchema, type FaultCode, type Guide } from "@/lib/models";
import { MemoryStore } from "@/lib/repo/memory";
import { searchContent, tokenize } from "@/lib/search";
import { guideArticleJsonLd, videoObjectJsonLd } from "@/lib/seo";
import categoriesSeed from "../../data/seed/categories.json";

async function published() {
  const st = new MemoryStore();
  const [guides, faultCodes, videos, categories] = await Promise.all([
    st.listGuides(),
    st.listFaultCodes(),
    st.listVideos(),
    st.listContentCategories(),
  ]);
  return { guides, faultCodes, videos, categories };
}

const guide = (over: Partial<Guide>): Guide =>
  guideSchema.parse({ id: over.slug ?? "g", slug: "g", title: "T", excerpt: "E", content: "C", status: "published", ...over });
const code = (over: Partial<FaultCode> & { code: string }): FaultCode =>
  faultCodeSchema.parse({ id: over.code.toLowerCase(), title: "T", meaning: "M", status: "published", ...over });

describe("content taxonomy seed", () => {
  it("has the confirmed vehicle groups and topics, all valid and unique", () => {
    const cats = categoriesSeed.map((c) => contentCategorySchema.parse(c));
    expect(cats.filter((c) => c.kind === "vehicle").map((c) => c.name)).toEqual(["Volkswagen Group", "Toyota"]);
    for (const t of ["Diesel", "Hybrid", "DPF", "Turbo", "Injectors", "Gearbox", "Clutch", "Timing belt", "Oil leaks", "Diagnostics"])
      expect(cats.some((c) => c.name === t), t).toBe(true);
    expect(new Set(cats.map((c) => c.slug)).size).toBe(cats.length);
  });
  it("makes no MOT, OnTrack, official or authorised claims", () => {
    expect(JSON.stringify(categoriesSeed)).not.toMatch(/\bMOT\b|ontrack|official|authori[sz]ed|approved|certified/i);
  });
});

describe("categories with content", () => {
  it("exposes only categories that have published content (drafts don't count)", async () => {
    const c = await published();
    const slugs = categoriesWithContent(c.categories, c).map((x) => x.category.slug);
    expect(slugs).toEqual(expect.arrayContaining(["volkswagen-group", "toyota", "diesel", "hybrid", "dpf", "diagnostics"]));
    // "turbo" is only used by a DRAFT fixture guide, so it must not become a public page.
    expect(slugs).not.toContain("turbo");
    expect(slugs).not.toContain("clutch");
  });
  it("counts guides, fault codes and videos in a category", async () => {
    const c = await published();
    const dpf = itemsInCategory("dpf", c);
    expect(dpf.guides.map((g) => g.slug)).toEqual(["fixture-diesel-dpf-warning-light"]);
    expect(dpf.videos.map((v) => v.slug)).toEqual(["fixture-dpf-video"]);
  });
});

describe("related content engine", () => {
  const a = guide({ slug: "a", relatedGuideSlugs: ["c"], categorySlugs: ["dpf"], vehicleMake: "Volkswagen", relatedFaultCodes: ["P0401"] });
  const b = guide({ slug: "b", categorySlugs: ["dpf"], vehicleMake: "volkswagen" });
  const c = guide({ slug: "c" });
  const d = guide({ slug: "d", relatedFaultCodes: ["P0401"] });
  const unrelated = guide({ slug: "z", categorySlugs: ["clutch"], vehicleMake: "Toyota" });

  it("ranks explicit links first, then shared codes, then shared categories/make; never random", () => {
    expect(relatedGuides(a, [a, b, c, d, unrelated]).map((g) => g.slug)).toEqual(["c", "d", "b"]);
  });
  it("never recommends the guide itself or a guide with no shared signal", () => {
    const r = relatedGuides(a, [a, unrelated]);
    expect(r).toEqual([]);
  });
  it("links fault codes to guides/videos in both directions", async () => {
    const all = await published();
    const p0401 = all.faultCodes.find((f) => f.code === "P0401")!;
    expect(guidesForFaultCode(p0401, all.guides).map((g) => g.slug)).toEqual(["fixture-diesel-dpf-warning-light"]);
    const dpfGuide = all.guides.find((g) => g.slug === "fixture-diesel-dpf-warning-light")!;
    expect(videosForGuide(dpfGuide, all.videos).map((v) => v.slug)).toEqual(["fixture-dpf-video"]);
  });
  it("relates fault codes by system or category only", () => {
    const x = code({ code: "P0401", system: "EGR", categorySlugs: ["diagnostics"] });
    const y = code({ code: "P0402", system: "egr" });
    const z = code({ code: "P0300", system: "Ignition" });
    expect(relatedFaultCodes(x, [x, y, z]).map((f) => f.code)).toEqual(["P0402"]);
  });
});

describe("pagination", () => {
  const items = Array.from({ length: 30 }, (_, i) => i);
  it("pages and clamps invalid input", () => {
    expect(paginate(items, undefined, 12)).toMatchObject({ page: 1, pageCount: 3, total: 30 });
    expect(paginate(items, "2", 12).items[0]).toBe(12);
    expect(paginate(items, "99", 12).page).toBe(3);
    expect(paginate(items, "-4", 12).page).toBe(1);
    expect(paginate(items, "abc", 12).page).toBe(1);
    expect(paginate([], "1").pageCount).toBe(1);
  });
});

describe("search", () => {
  it("tokenises case- and punctuation-insensitively", () => {
    expect(tokenize("  VW  2.0-TDI!! ")).toEqual(["vw", "2", "0", "tdi"]);
  });
  it("finds fault codes and the guides that reference them", async () => {
    const c = await published();
    const r = searchContent("P0401", c);
    expect(r.faultCodes.map((f) => f.code)).toEqual(["P0401"]);
    expect(r.guides.map((g) => g.slug)).toEqual(["fixture-diesel-dpf-warning-light"]);
  });
  it("expands shorthand (vw -> volkswagen) and requires every word to match", async () => {
    const c = await published();
    expect(searchContent("vw diesel", c).guides.map((g) => g.slug)).toEqual(["fixture-diesel-dpf-warning-light"]);
    expect(searchContent("hybrid", c).guides.map((g) => g.slug)).toEqual(["fixture-hybrid-warning-message"]);
    expect(searchContent("hybrid dpf", c).guides).toEqual([]);
    expect(searchContent("DPF", c).categories.map((x) => x.slug)).toContain("dpf");
  });
  it("returns nothing for empty or unknown queries, and never drafts", async () => {
    const c = await published();
    expect(searchContent("", c).total).toBe(0);
    expect(searchContent("qqqqzzzz", c).total).toBe(0);
    expect(searchContent("DRAFT guide that must never be public", c).guides).toEqual([]);
  });
});

describe("admin form parsing", () => {
  it("parses FAQ blocks and round-trips them", () => {
    const text = "Q: First?\nA: One.\n\nQ: Second?\nA: Two\nlines.";
    const { faqs, error } = parseFaqs(text);
    expect(error).toBeUndefined();
    expect(faqs).toEqual([{ question: "First?", answer: "One." }, { question: "Second?", answer: "Two\nlines." }]);
    expect(parseFaqs(formatFaqs(faqs)).faqs).toEqual(faqs);
  });
  it("reports a malformed FAQ instead of dropping it", () => {
    expect(parseFaqs("Just a question?").error).toMatch(/Q:/);
    expect(parseFaqs("").faqs).toBeUndefined();
  });
  it("dedupes checkbox values", () => {
    expect(parseCheckboxes(["dpf", "dpf", " turbo ", ""])).toEqual(["dpf", "turbo"]);
    expect(parseCheckboxes([])).toBeUndefined();
  });
});

describe("structured data honesty", () => {
  it("VideoObject uses the YouTube upload date only, never this site's publish date", () => {
    const base = { id: "v", slug: "v", title: "V", youtubeUrl: "https://www.youtube.com/watch?v=abcdefghijk", youtubeVideoId: "abcdefghijk", status: "published" as const };
    const noDate = videoObjectJsonLd(videoSchema.parse({ ...base, publishedAt: "2026-01-01T00:00:00Z" }), "https://x.test");
    expect(noDate.uploadDate).toBeUndefined();
    const dated = videoObjectJsonLd(videoSchema.parse({ ...base, uploadDate: "2025-11-02", duration: "PT8M12S" }), "https://x.test");
    expect(dated).toMatchObject({ uploadDate: "2025-11-02", duration: "PT8M12S" });
  });
  it("rejects malformed durations and non-https canonical URLs", () => {
    expect(videoSchema.shape.duration.safeParse("8 minutes").success).toBe(false);
    expect(videoSchema.shape.duration.safeParse("PT").success).toBe(false);
    expect(guideSchema.shape.canonicalUrl.safeParse("http://x.test/a").success).toBe(false);
  });
  it("Article has mainEntityOfPage and only the author/publisher actually given", () => {
    const ld = guideArticleJsonLd(guide({ slug: "a" }), "https://x.test", "AutoFixHub");
    expect(ld.mainEntityOfPage).toEqual({ "@type": "WebPage", "@id": "https://x.test/guides/a" });
    expect(ld.author).toBeUndefined();
    expect(ld.publisher).toMatchObject({ name: "AutoFixHub" });
  });
});
