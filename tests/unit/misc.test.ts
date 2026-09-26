import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { hasRole } from "@/lib/auth/roles";
import { hoursSummary, mapsHref, telHref, whatsappHref } from "@/lib/contact";
import {
  businessSettingsSchema, formatPrice, serviceCategorySchema, serviceSchema, ROLES,
} from "@/lib/models";
import { MemoryStore } from "@/lib/repo/memory";
import { autoRepairJsonLd } from "@/lib/seo";
// The dormant workshop catalogue (WORKSHOP_FEATURES_ENABLED) lives in service-categories.json.
import categories from "../../data/seed/service-categories.json";
import services from "../../data/seed/services.json";
import fixture from "../fixtures/settings.fixture.json";
import manifest from "../../public/animation/corolla/manifest.json";

describe("roles", () => {
  it("allows a matching role and business", () => expect(hasRole({ role: "manager", businessId: "b1" }, ["owner", "manager"], "b1")).toBe(true));
  it("denies a role that is not allowed", () => expect(hasRole({ role: "editor", businessId: "b1" }, ["owner"], "b1")).toBe(false));
  it("denies another business", () => expect(hasRole({ role: "owner", businessId: "b2" }, ROLES, "b1")).toBe(false));
  it("denies unknown roles, missing claims and no claims at all", () => {
    expect(hasRole({ role: "admin", businessId: "b1" }, ROLES, "b1")).toBe(false);
    expect(hasRole({ businessId: "b1" }, ROLES, "b1")).toBe(false);
    expect(hasRole({}, ROLES, "b1")).toBe(false);
    expect(hasRole(null, ROLES, "b1")).toBe(false);
  });
});

describe("seed catalogue (dormant workshop services)", () => {
  // AutoFixHub's confirmed expertise (launch finalisation); the generic demo catalogue was removed.
  const EXPECTED = ["Volkswagen Group Diesel", "Toyota Hybrid", "Gearbox & Clutch", "DPF, Turbo & Injectors",
    "Timing Belt & Oil Leaks", "Wiring & Electrical Diagnostics"];
  it("has exactly the confirmed categories, in order", () => {
    expect(categories.map((c) => c.name)).toEqual(EXPECTED);
    for (const c of categories) expect(serviceCategorySchema.safeParse(c).success, c.slug).toBe(true);
  });
  it("services validate, are unique and reference real categories", () => {
    const ids = new Set(categories.map((c) => c.id));
    const slugs = new Set<string>();
    for (const s of services) {
      expect(serviceSchema.safeParse(s).success, s.slug).toBe(true);
      expect(ids.has(s.categoryId)).toBe(true);
      expect(slugs.has(s.slug)).toBe(false);
      slugs.add(s.slug);
    }
    for (const c of categories) expect(services.some((s) => s.categoryId === c.id), c.slug).toBe(true);
  });
  it("makes no MOT claim and offers no unconfirmed services", () => {
    const text = JSON.stringify([categories, services]);
    expect(text).not.toMatch(/\bMOT\b/);
    expect(text).not.toMatch(/servicing|tyre|air con|brake|all types of/i);
  });
  it("invents no prices or drafts nothing as published", () => {
    for (const s of services) {
      expect(s.priceMode).toBe("quote");
      expect(s.status).toBe("draft");
      expect("pricePence" in s).toBe(false);
    }
  });
  it("memory store lists categories/services ordered", async () => {
    const st = new MemoryStore();
    const cats = await st.listCategories();
    expect(cats).toHaveLength(categories.length);
    expect(cats.map((c) => c.order)).toEqual([...cats.map((c) => c.order)].sort((a, b) => a - b));
    expect((await st.listServices()).length).toBe(services.length);
  });
});

describe("settings, contact helpers and SEO", () => {
  const s = businessSettingsSchema.parse(fixture);
  it("builds contact links", () => {
    expect(telHref("01632 960123")).toBe("tel:01632960123");
    expect(whatsappHref("+447700900123", "Hi there")).toBe("https://wa.me/447700900123?text=Hi%20there");
    expect(mapsHref(s)).toContain("google.com/maps/search");
    expect(mapsHref({ ...s, mapsUrl: "https://maps.app.goo.gl/x" })).toBe("https://maps.app.goo.gl/x");
    expect(mapsHref(null)).toBeNull();
  });
  it("summarises opening hours by grouping days", () => expect(hoursSummary(s)).toBe("Mon – Fri 09:00 – 17:00 | Sat – Sun Closed"));
  it("rejects invalid settings values", () => {
    expect(businessSettingsSchema.safeParse({ phone: "1", whatsapp: "abc" }).success).toBe(false);
    expect(businessSettingsSchema.safeParse({ googleReviewsUrl: "http://insecure.example" }).success).toBe(false);
    expect(businessSettingsSchema.safeParse({ featuredVideoYoutubeId: "short" }).success).toBe(false);
  });
  it("emits no structured data until a name and address exist", () => {
    expect(autoRepairJsonLd(null)).toBeNull();
    expect(autoRepairJsonLd({ tradingName: "X" })).toBeNull();
    const ld = autoRepairJsonLd(s);
    expect(ld?.["@type"]).toBe("AutoRepair");
    expect(JSON.stringify(ld)).not.toMatch(/aggregateRating|review/i);
  });
  it("formats prices", () => {
    expect(formatPrice({ priceMode: "quote" })).toBe("Quote on request");
    expect(formatPrice({ priceMode: "from", pricePence: 4999, vatIncluded: true })).toBe("From £49.99 inc. VAT");
    expect(formatPrice({ priceMode: "fixed", pricePence: 10000, vatIncluded: false })).toBe("£100.00 + VAT");
  });
});

describe("animation frames on disk", () => {
  const dir = path.join(process.cwd(), "public/animation/corolla");
  function jpegSize(buf: Buffer) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) return null;
      const m = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      i += 2 + len;
    }
    return null;
  }
  it("manifest is consistent with the source sequence (232 frames, 38 exact duplicates skipped)", () => {
    expect(manifest.sourceFrameCount).toBe(232);
    expect(manifest.frames).toHaveLength(194);
    expect(manifest.skippedDuplicates).toHaveLength(38);
    expect(manifest.frames[0]).toBe("frame-001.jpg");
    expect(manifest.frames.at(-1)).toBe("frame-232.jpg");
  });
  it("every listed frame exists, is a 720x1280 JPEG", () => {
    for (const f of manifest.frames) {
      const p = path.join(dir, f);
      expect(existsSync(p), f).toBe(true);
      const buf = readFileSync(p);
      expect([buf[0], buf[1]]).toEqual([0xff, 0xd8]);
      expect(jpegSize(buf), f).toEqual({ w: 720, h: 1280 });
    }
  });
});
