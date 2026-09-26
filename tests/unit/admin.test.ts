import { describe, expect, it } from "vitest";
import { extractYoutubeId, youtubeWatchUrl } from "@/lib/admin/youtube";
import { isSafeImageRef, parseCsvIds, parseLines } from "@/lib/admin/forms";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  galleryImageSchema,
  reviewSchema,
  businessSettingsSchema,
  socialLinksSchema,
} from "@/lib/models";

describe("extractYoutubeId", () => {
  it("accepts a bare 11-char id", () => {
    expect(extractYoutubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("extracts from a watch URL", () => {
    expect(extractYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("extracts from a watch URL with extra params", () => {
    expect(extractYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s&list=abc")).toBe("dQw4w9WgXcQ");
  });
  it("extracts from a youtu.be short link", () => {
    expect(extractYoutubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("extracts from a youtu.be short link with a trailing query", () => {
    expect(extractYoutubeId("https://youtu.be/dQw4w9WgXcQ?t=5")).toBe("dQw4w9WgXcQ");
  });
  it("extracts from a shorts URL", () => {
    expect(extractYoutubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("extracts from an embed URL", () => {
    expect(extractYoutubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("extracts from a bare-domain URL (no www)", () => {
    expect(extractYoutubeId("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("rejects an unrelated URL", () => {
    expect(extractYoutubeId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
  it("rejects a watch URL with no v param", () => {
    expect(extractYoutubeId("https://www.youtube.com/watch")).toBeNull();
  });
  it("rejects garbage input", () => {
    expect(extractYoutubeId("not a url at all")).toBeNull();
    expect(extractYoutubeId("")).toBeNull();
  });
  it("round-trips through youtubeWatchUrl", () => {
    const id = "dQw4w9WgXcQ";
    expect(extractYoutubeId(youtubeWatchUrl(id))).toBe(id);
  });
});

describe("admin form parsing helpers", () => {
  it("parseLines trims, drops blanks, and returns undefined when empty", () => {
    expect(parseLines("a\n b \n\nc\n")).toEqual(["a", "b", "c"]);
    expect(parseLines("   \n  \n")).toBeUndefined();
    expect(parseLines(null)).toBeUndefined();
  });
  it("parseCsvIds trims, drops blanks, and returns undefined when empty", () => {
    expect(parseCsvIds("a, b ,,c")).toEqual(["a", "b", "c"]);
    expect(parseCsvIds(" , ,")).toBeUndefined();
    expect(parseCsvIds(null)).toBeUndefined();
  });
});

describe("booking status model", () => {
  it("has a label for every status, in the order given in the brief", () => {
    expect(BOOKING_STATUSES).toEqual(["new", "contacted", "confirmed", "in_progress", "completed", "cancelled"]);
    for (const s of BOOKING_STATUSES) expect(BOOKING_STATUS_LABELS[s]).toBeTruthy();
  });
});

describe("gallery and review schemas", () => {
  it("parses a valid gallery image", () => {
    const img = galleryImageSchema.parse({
      id: "abc",
      path: "gallery/biz/abc.jpg",
      url: "https://storage.googleapis.com/bucket/gallery/biz/abc.jpg",
      contentType: "image/jpeg",
      size: 1234,
      order: 0,
      status: "draft",
    });
    expect(img.status).toBe("draft");
  });
  it("rejects a review with an out-of-range rating", () => {
    expect(() =>
      reviewSchema.parse({
        id: "r1",
        name: "A. Customer",
        rating: 6,
        review: "Great service",
        date: "2026-01-01",
        source: "google",
        status: "draft",
      }),
    ).toThrow();
  });
  it("never invents review content — every field must be supplied", () => {
    expect(() => reviewSchema.parse({ id: "r1", status: "draft" })).toThrow();
  });
});

describe("business settings: logo and social links", () => {
  it("accepts an https logo URL and social links", () => {
    const settings = businessSettingsSchema.parse({
      tradingName: "Apex Autowerks",
      logoUrl: "https://example.com/logo.png",
      socialLinks: { facebook: "https://facebook.com/apex", instagram: "https://instagram.com/apex" },
    });
    expect(settings.logoUrl).toBe("https://example.com/logo.png");
    expect(settings.socialLinks?.facebook).toContain("facebook.com");
  });
  it("rejects a non-https logo URL", () => {
    expect(() => businessSettingsSchema.parse({ logoUrl: "http://example.com/logo.png" })).toThrow();
  });
  it("rejects a non-https social link", () => {
    expect(() => socialLinksSchema.parse({ facebook: "http://facebook.com/apex" })).toThrow();
  });
});

describe("isSafeImageRef", () => {
  it("accepts https URLs and site-relative paths", () => {
    expect(isSafeImageRef("https://cdn.example.com/a.jpg")).toBe(true);
    expect(isSafeImageRef("/images/a.jpg")).toBe(true);
  });
  it("rejects script, data, plain-http and protocol-relative references", () => {
    expect(isSafeImageRef("javascript:alert(1)")).toBe(false);
    expect(isSafeImageRef("data:image/png;base64,AAAA")).toBe(false);
    expect(isSafeImageRef("http://example.com/a.jpg")).toBe(false);
    expect(isSafeImageRef("//evil.example/a.jpg")).toBe(false);
    expect(isSafeImageRef("/\\evil.example/a.jpg")).toBe(false);
    expect(isSafeImageRef("images/a.jpg")).toBe(false);
  });
});
