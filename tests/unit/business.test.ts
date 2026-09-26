import { describe, expect, it } from "vitest";
import { CONFIRMED_BUSINESS, withConfirmedBusiness } from "@/lib/business";
import { organizationJsonLd } from "@/lib/seo";

describe("confirmed business facts", () => {
  it("fills only confirmed facts when settings are empty", () => {
    const s = withConfirmedBusiness(null);
    expect(s.tradingName).toBe("AutoFixHub");
    expect(s.email).toBe("muhammadibrahimx53@gmail.com");
    expect(s.socialLinks?.youtube).toBe("https://www.youtube.com/@muhammadibrahim-vw");
    // Never invented: no address, phone, WhatsApp, hours, legal details or accreditations.
    for (const k of ["address", "phone", "whatsapp", "openingHours", "legalName", "companyNumber", "accreditations", "mapsUrl"] as const)
      expect(s[k], k).toBeUndefined();
  });
  it("uses the correctly formed email only", () => {
    expect(CONFIRMED_BUSINESS.email).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]+$/);
    expect(JSON.stringify(withConfirmedBusiness(null))).not.toContain("muhammadibrahimx53gmail.com");
  });
  it("never overrides values saved in the settings document", () => {
    const s = withConfirmedBusiness({ tradingName: "Saved Name", email: "saved@example.com", socialLinks: { youtube: "https://www.youtube.com/@saved" } });
    expect(s.tradingName).toBe("Saved Name");
    expect(s.email).toBe("saved@example.com");
    expect(s.socialLinks?.youtube).toBe("https://www.youtube.com/@saved");
  });
  it("makes no MOT, OnTrack, 'official' or superlative claims", () => {
    const text = JSON.stringify(withConfirmedBusiness(null));
    expect(text).not.toMatch(/\bMOT\b|ontrack|official|authori[sz]ed|approved|best|number one|certified/i);
  });
});

describe("Organization JSON-LD", () => {
  it("contains only verified facts", () => {
    const ld = organizationJsonLd(withConfirmedBusiness(null), "https://autofixhub.example", "Manchester")!;
    expect(ld).toMatchObject({
      "@type": "Organization",
      name: "AutoFixHub",
      url: "https://autofixhub.example",
      email: "muhammadibrahimx53@gmail.com",
      sameAs: ["https://www.youtube.com/@muhammadibrahim-vw"],
      address: { addressLocality: "Manchester", addressCountry: "GB" },
    });
    const text = JSON.stringify(ld);
    expect(text).not.toMatch(/telephone|openingHours|aggregateRating|review|priceRange|streetAddress|postalCode/i);
  });
});
