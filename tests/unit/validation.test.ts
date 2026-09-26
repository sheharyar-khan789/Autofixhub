import { describe, expect, it } from "vitest";
import { bookingInputSchema, flattenZodErrors, rawBookingFromFields } from "@/lib/validation/booking";
import { sniffImageType } from "@/lib/validation/photos";
import {
  isPlausibleVrm, normaliseUkPhone, normaliseVrm, validatePreferredDate, londonToday, addDaysIso,
} from "@/lib/validation/uk";
import { businessSettingsSchema } from "@/lib/models";
import fixture from "../fixtures/settings.fixture.json";
import { nextDay, nextWeekday, validFields, jpegBytes, pngBytes } from "./helpers";

const settings = businessSettingsSchema.parse(fixture);

describe("VRM", () => {
  it("normalises", () => expect(normaliseVrm(" ab21-cde ")).toBe("AB21CDE"));
  it.each(["AB21CDE", "A123BCD", "ABC123D", "AB12", "1234AB", "K1NGS"])("accepts %s", (v) =>
    expect(isPlausibleVrm(v)).toBe(true));
  it.each(["", "A", "ABCDEFG", "1234567", "AB21CDE99", "!!!"])("rejects %s", (v) =>
    expect(isPlausibleVrm(normaliseVrm(v))).toBe(false));
});

describe("UK phone", () => {
  it.each([
    ["07700 900123", "+447700900123"],
    ["+44 7700 900123", "+447700900123"],
    ["0044 7700 900123", "+447700900123"],
    ["01632 960123", "+441632960123"],
    ["020 7946 0123", "+442079460123"],
    ["(0161) 496 0000", "+441614960000"],
  ])("normalises %s", (i, o) => expect(normaliseUkPhone(i)).toBe(o));
  it.each(["", "12345", "0770090012", "07700900123456", "+1 202 555 0100", "abc", "0800 1234 567 89"])(
    "rejects %s", (i) => expect(normaliseUkPhone(i)).toBeNull());
});

describe("preferred date", () => {
  const now = new Date("2026-09-25T10:00:00Z"); // Friday
  it("accepts a future weekday", () => expect(validatePreferredDate("2026-09-28", settings, now)).toBeNull());
  it("accepts today", () => expect(validatePreferredDate("2026-09-25", settings, now)).toBeNull());
  it("rejects the past", () => expect(validatePreferredDate("2026-09-24", settings, now)).toMatch(/future/));
  it("rejects an impossible date", () => expect(validatePreferredDate("2026-02-30", settings, now)).toMatch(/valid/));
  it("rejects a closed day", () => expect(validatePreferredDate("2026-09-26", settings, now)).toMatch(/closed/));
  it("rejects beyond the horizon", () => {
    expect(validatePreferredDate(addDaysIso(londonToday(now), 91), null, now)).toMatch(/90 days/);
  });
  it("does not apply day rules when no hours are configured", () => {
    expect(validatePreferredDate("2026-09-26", null, now)).toBeNull();
  });
  it("test helpers produce valid/closed dates", () => {
    expect(validatePreferredDate(nextWeekday(), settings)).toBeNull();
    expect(validatePreferredDate(nextDay("sat"), settings)).toMatch(/closed/);
  });
});

describe("photo sniffing", () => {
  it("identifies by content", () => {
    expect(sniffImageType(jpegBytes())).toBe("image/jpeg");
    expect(sniffImageType(pngBytes())).toBe("image/png");
    const webp = new Uint8Array(20); webp.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(sniffImageType(webp)).toBe("image/webp");
  });
  it("rejects scripts, SVG and HTML", () => {
    const enc = (s: string) => new TextEncoder().encode(s);
    expect(sniffImageType(enc("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(sniffImageType(enc("<script>alert(1)</script>"))).toBeNull();
    expect(sniffImageType(new Uint8Array(0))).toBeNull();
  });
});

describe("booking schema", () => {
  it("normalises a valid submission", () => {
    const r = bookingInputSchema.safeParse(rawBookingFromFields(validFields()));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.name).toBe("Alex Driver");
      expect(r.data.email).toBe("alex@example.com");
      expect(r.data.vrm).toBe("AB21CDE");
      expect(r.data.phone).toBe("+447700900123");
    }
  });
  it("reports a friendly error per field", () => {
    const r = bookingInputSchema.safeParse(rawBookingFromFields({}));
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = flattenZodErrors(r.error);
      for (const k of ["name", "phone", "email", "vrm", "make", "model", "serviceId", "preferredDate", "preferredTime", "description", "privacyAccepted"])
        expect(e[k], k).toBeTruthy();
    }
  });
  it("strips control characters and rejects too-short descriptions", () => {
    const ok = bookingInputSchema.parse(rawBookingFromFields(validFields("x", { name: "Al\u0000ex\u0007 D" })));
    expect(ok.name).toBe("Alex D");
    expect(bookingInputSchema.safeParse(rawBookingFromFields(validFields("x", { description: "short" }))).success).toBe(false);
  });
  it("requires an explicit privacy confirmation", () => {
    expect(bookingInputSchema.safeParse(rawBookingFromFields(validFields("x", { privacyAccepted: "false" }))).success).toBe(false);
  });
  it("rejects an unknown time window", () => {
    expect(bookingInputSchema.safeParse(rawBookingFromFields(validFields("x", { preferredTime: "midnight" }))).success).toBe(false);
  });
});
