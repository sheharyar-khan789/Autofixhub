import { describe, expect, it } from "vitest";
import { extractYoutubeId, youtubeWatchUrl } from "@/lib/admin/youtube";
import { invalid, isSafeImageRef, parseCsvIds, parseLines, schemaErrors } from "@/lib/admin/forms";
import { AdminConflictError, AdminNotFoundError, adminFailure } from "@/lib/admin/content";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  contentCategorySchema,
  faultCodeSchema,
  galleryImageSchema,
  guideSchema,
  videoSchema,
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

describe("fault code format", () => {
  const input = faultCodeSchema.omit({ id: true });
  const base = { title: "Title", meaning: "Meaning", status: "draft" };

  it.each(["P0420", "p0420", "P0A80", "U3FFF", "B1234", "C0035", "P268172", "u123456"])("accepts %s", (code) => {
    const res = input.safeParse({ ...base, code });
    expect(res.success).toBe(true);
    expect(res.success && res.data.code).toBe(code.toUpperCase());
  });

  it.each(["P042", "P04200", "P2681720", "X0420", "P0G00", "P26817A", "0420", ""])("rejects %j with an explanation", (code) => {
    const res = input.safeParse({ ...base, code });
    expect(res.success).toBe(false);
    expect(schemaErrors(res.success ? [] : res.error.issues).fieldErrors?.code).toMatch(/^Use P, B, C or U followed by 4 characters/);
  });

  it("saves with every optional field left blank", () => {
    const res = input.safeParse({ ...base, code: "P268172" });
    expect(res.success).toBe(true);
    expect(res.success && res.data).toMatchObject({ code: "P268172", scope: "generic" });
  });
});

describe("related fault codes (video and guide forms)", () => {
  // Exactly what the video/guide actions do with the comma-separated input.
  const fromInput = (v: string) => parseCsvIds(v)?.map((c) => c.toUpperCase());

  it.each([
    ["P268111,P268172", ["P268111", "P268172"]],
    ["P0420, P268111,P268172", ["P0420", "P268111", "P268172"]],
    ["  p0420 ,  p268111  ,", ["P0420", "P268111"]],
    ["P0A80, U3FFF, B123456", ["P0A80", "U3FFF", "B123456"]],
  ])("accepts %j", (typed, expected) => {
    for (const schema of [videoSchema, guideSchema]) {
      const res = schema.shape.relatedFaultCodes.safeParse(fromInput(typed));
      expect(res.success).toBe(true);
      expect(res.data).toEqual(expected);
    }
  });

  it("a blank field is allowed", () => {
    expect(fromInput("  ")).toBeUndefined();
    expect(videoSchema.shape.relatedFaultCodes.safeParse(undefined).success).toBe(true);
  });

  it("points at the bad entry", () => {
    const res = videoSchema.omit({ id: true }).safeParse({
      slug: "s",
      title: "t",
      youtubeUrl: "https://www.youtube.com/watch?v=abcdefghijk",
      youtubeVideoId: "abcdefghijk",
      relatedFaultCodes: fromInput("P268111, P12, P2681"),
      status: "draft",
    });
    expect(schemaErrors(res.success ? [] : res.error.issues).fieldErrors).toEqual({
      relatedFaultCodes: expect.stringMatching(/^Entry 2: Use P, B, C or U followed by 4 characters/),
    });
  });
});

describe("admin form field errors", () => {
  const categoryInput = contentCategorySchema.omit({ id: true, createdAt: true, updatedAt: true });

  it("puts each schema problem on its own input, in plain words, with a summary", () => {
    const res = categoryInput.safeParse({ name: "", slug: "Not A Slug", seoTitle: "x".repeat(71), status: "draft" });
    expect(res.success).toBe(false);
    const state = schemaErrors(res.success ? [] : res.error.issues);
    expect(state.fieldErrors).toEqual({
      name: "This field is required.",
      slug: "This isn't in a valid format.",
      seoTitle: "Must be 70 characters or fewer.",
    });
    expect(state.error).toBe("Couldn't save: fix the 3 highlighted fields.");
  });

  it("keeps only the first message per input and names the entry of a list", () => {
    const res = faultCodeSchema.omit({ id: true }).safeParse({
      code: "P0420",
      title: "t",
      meaning: "m",
      symptoms: ["ok", "x".repeat(201), "y".repeat(201)],
      status: "draft",
    });
    const state = schemaErrors(res.success ? [] : res.error.issues);
    expect(state.fieldErrors).toEqual({ symptoms: "Entry 2: Must be 200 characters or fewer." });
    expect(state.error).toBe("Couldn't save: fix the highlighted field.");
  });

  it("errors found before schema validation win, and a custom path mapping is applied", () => {
    const state = schemaErrors(
      [{ code: "invalid_format", path: ["youtubeVideoId"], message: "Invalid string" }],
      { youtubeUrl: "Couldn't find a valid YouTube video in that URL." },
      (p) => (p[0] === "youtubeVideoId" ? "youtubeUrl" : undefined),
    );
    expect(state.fieldErrors).toEqual({ youtubeUrl: "Couldn't find a valid YouTube video in that URL." });
  });

  it("issues without an input go to the summary instead of being lost", () => {
    expect(schemaErrors([{ path: [], message: "Something is wrong." }])).toEqual({ error: "Something is wrong." });
    const mixed = schemaErrors([{ path: [], message: "Whole-form problem." }], { slug: "Taken." });
    expect(mixed.fieldErrors).toEqual({ slug: "Taken." });
    expect(mixed.error).toContain("Whole-form problem.");
  });

  it("custom schema messages are kept", () => {
    const res = businessSettingsSchema.safeParse({ socialLinks: { facebook: "http://facebook.com/x" } });
    const state = schemaErrors(res.success ? [] : res.error.issues, {}, (p) => (p[0] === "socialLinks" ? "socialFacebook" : undefined));
    expect(state.fieldErrors).toEqual({ socialFacebook: "Must be an https:// link." });
  });

  it("a duplicate slug/code is shown on that input; other failures stay generic", () => {
    const conflict = new AdminConflictError('Another record already uses the slug "dpf". Choose a different slug.', "slug");
    expect(adminFailure(conflict, "fallback").fieldErrors).toEqual({ slug: conflict.message });
    expect(adminFailure(new AdminNotFoundError(), "fallback")).toEqual({ error: "Record not found." });
    expect(adminFailure(new Error("PERMISSION_DENIED: raw firestore detail"), "Could not save.")).toEqual({ error: "Could not save." });
  });

  it("invalid() builds the summary from the number of fields", () => {
    expect(invalid({ file: "Choose an image to upload." })).toEqual({
      fieldErrors: { file: "Choose an image to upload." },
      error: "Couldn't save: fix the highlighted field.",
    });
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
