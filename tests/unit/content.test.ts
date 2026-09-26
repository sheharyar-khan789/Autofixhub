import { describe, expect, it } from "vitest";
import { businessSettingsSchema, faultCodeSchema, guideSchema, serviceSchema, videoSchema } from "@/lib/models";
import { MemoryStore } from "@/lib/repo/memory";
import { breadcrumbJsonLd, faqJsonLd, faultCodeJsonLd, guideArticleJsonLd, serviceJsonLd, videoObjectJsonLd } from "@/lib/seo";
import faultCodes from "../../data/seed/fault-codes.json";
import guides from "../../data/seed/guides.json";
import videos from "../../data/seed/videos.json";
import fixture from "../fixtures/settings.fixture.json";

describe("Phase 2 seed data", () => {
  it("guides.json and videos.json start empty (no fabricated articles/videos)", () => {
    expect(guides).toEqual([]);
    expect(videos).toEqual([]);
  });
  it("fault codes validate, are unique, and start as drafts pending review", () => {
    const seen = new Set<string>();
    for (const f of faultCodes) {
      const res = faultCodeSchema.safeParse(f);
      expect(res.success, JSON.stringify(f)).toBe(true);
      expect(f.status).toBe("draft");
      expect(seen.has(f.code)).toBe(false);
      seen.add(f.code);
    }
  });
  it("generic fault codes are marked generic, not asserted for every vehicle", () => {
    for (const f of faultCodes) expect(f.scope).toBe("generic");
  });
});

describe("guide/fault-code/video schemas", () => {
  it("rejects a malformed fault code", () => {
    expect(faultCodeSchema.safeParse({ id: "x", code: "9999", title: "t", meaning: "m", status: "draft" }).success).toBe(
      false,
    );
  });
  it("uppercases fault codes and their cross-references", () => {
    const code = faultCodeSchema.parse({ id: "p0420", code: "p0420", title: "t", meaning: "m", status: "published" });
    expect(code.code).toBe("P0420");
    const guide = guideSchema.parse({
      id: "g1",
      slug: "guide-one",
      title: "Guide",
      excerpt: "e",
      content: "c",
      relatedFaultCodes: ["p0420"],
      status: "published",
    });
    expect(guide.relatedFaultCodes).toEqual(["P0420"]);
  });
  it("rejects a video with an invalid YouTube id or non-https url", () => {
    const base = { id: "v1", slug: "v1", title: "t", status: "published" as const };
    expect(videoSchema.safeParse({ ...base, youtubeUrl: "https://youtu.be/abc", youtubeVideoId: "short" }).success).toBe(
      false,
    );
    expect(
      videoSchema.safeParse({ ...base, youtubeUrl: "http://youtu.be/abc", youtubeVideoId: "dQw4w9WgXcQ" }).success,
    ).toBe(false);
  });
});

describe("memory store: guides, fault codes, videos", () => {
  it("treats all seeded fault codes as published in memory mode, sorted by code", async () => {
    const st = new MemoryStore();
    const list = await st.listFaultCodes();
    expect(list.length).toBe(faultCodes.length);
    expect(list.every((c) => c.code === c.code.toUpperCase())).toBe(true);
    expect(list.map((c) => c.code)).toEqual([...list.map((c) => c.code)].sort());
  });
  it("looks up a fault code case-insensitively and returns null when missing", async () => {
    const st = new MemoryStore();
    expect((await st.getFaultCodeByCode("p0420"))?.title).toContain("Catalyst");
    expect(await st.getFaultCodeByCode("P9999")).toBeNull();
  });
  // The real seed has no guides/videos (nothing invented); memory mode adds the clearly
  // fictional content fixture, keeping each item's status so drafts can be tested.
  it("lists only published guides/videos; drafts are never returned publicly", async () => {
    const st = new MemoryStore();
    const guides = await st.listGuides();
    expect(guides.map((g) => g.slug)).toEqual(["fixture-diesel-dpf-warning-light", "fixture-hybrid-warning-message"]);
    expect(guides.every((g) => g.status === "published")).toBe(true);
    expect(await st.getGuideBySlug("fixture-draft-guide")).toBeNull();
    expect(await st.getGuideBySlug("anything")).toBeNull();
    expect((await st.listVideos()).map((v) => v.slug)).toEqual(["fixture-dpf-video"]);
    expect(await st.getVideoBySlug("anything")).toBeNull();
  });
});

describe("Phase 2 structured data", () => {
  const settings = businessSettingsSchema.parse(fixture);
  const service = serviceSchema.parse({
    id: "s1",
    categoryId: "c1",
    name: "Full Service",
    slug: "full-service",
    summary: "A full service.",
    priceMode: "quote",
    order: 1,
    status: "published",
  });

  it("builds BreadcrumbList only for 2+ crumbs", () => {
    expect(breadcrumbJsonLd([{ name: "Home", url: "https://x.test" }])).toBeNull();
    const ld = breadcrumbJsonLd([
      { name: "Home", url: "https://x.test" },
      { name: "Guides", url: "https://x.test/guides" },
    ]);
    expect(ld?.["@type"]).toBe("BreadcrumbList");
    expect(ld?.itemListElement).toHaveLength(2);
  });

  it("Service JSON-LD includes a provider only when settings are present", () => {
    const withProvider = serviceJsonLd(service, "https://x.test", settings);
    expect(withProvider.provider).toBeDefined();
    const withoutProvider = serviceJsonLd(service, "https://x.test", null);
    expect(withoutProvider.provider).toBeUndefined();
  });

  it("Article JSON-LD only states facts present on the guide", () => {
    const guide = guideSchema.parse({
      id: "g1",
      slug: "slug",
      title: "Title",
      excerpt: "Excerpt",
      content: "Body",
      status: "published",
    });
    const ld = guideArticleJsonLd(guide, "https://x.test");
    expect(ld.author).toBeUndefined();
    expect(ld.datePublished).toBeUndefined();
    expect(JSON.stringify(ld)).not.toMatch(/undefined/);
  });

  it("TechArticle headline includes the code, not just a generic title", () => {
    const code = faultCodeSchema.parse(faultCodes[0]);
    const ld = faultCodeJsonLd(code, "https://x.test");
    expect(ld.headline).toContain(code.code);
  });

  it("VideoObject always includes a thumbnail, falling back to YouTube's", () => {
    const video = videoSchema.parse({
      id: "v1",
      slug: "v1",
      title: "How to",
      youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
      youtubeVideoId: "dQw4w9WgXcQ",
      status: "published",
    });
    const ld = videoObjectJsonLd(video, "https://x.test");
    expect(ld.thumbnailUrl[0]).toContain("dQw4w9WgXcQ");
  });

  it("FAQPage is only emitted when real FAQ content exists", () => {
    expect(faqJsonLd(undefined)).toBeNull();
    expect(faqJsonLd([])).toBeNull();
    const ld = faqJsonLd([{ question: "Q?", answer: "A." }]);
    expect(ld?.["@type"]).toBe("FAQPage");
  });
});
