import { beforeEach, describe, expect, it, vi } from "vitest";
import { BOOKING_RATE_LIMIT, createBooking } from "@/lib/booking/create";
import { MemoryStore } from "@/lib/repo/memory";
import { businessSettingsSchema } from "@/lib/models";
import fixture from "../fixtures/settings.fixture.json";
import { jpegBytes, nextDay, validFields } from "./helpers";

const settings = businessSettingsSchema.parse(fixture);
let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
const run = (over: Partial<Parameters<typeof createBooking>[1]> = {}) =>
  createBooking(store, { fields: validFields(), photos: [], ipHash: "ip1", settings, ...over });

describe("createBooking", () => {
  it("stores a normalised booking with snapshots and returns a reference", async () => {
    const r = await run();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.reference).toMatch(/^BK-[A-HJ-NP-Z2-9]{8}$/);
    expect(store.bookings.size).toBe(1);
    const b = [...store.bookings.values()][0];
    expect(b.status).toBe("new");
    expect(b.reference).toBe(r.reference);
    expect(b.customer).toEqual({ name: "Alex Driver", phone: "+447700900123", email: "alex@example.com" });
    expect(b.vehicle).toMatchObject({ vrm: "AB21CDE", make: "Toyota", model: "Corolla", source: "manual" });
    expect(b.serviceSnapshot).toMatchObject({ name: "Clutch problems", categoryName: "Gearbox & Clutch" });
    expect(b.consent.privacyAcceptedAt).toMatch(/^\d{4}-/);
    expect(b.businessId).toBe("default");
  });

  it("uploads validated photos next to the booking", async () => {
    const r = await run({ photos: [{ bytes: jpegBytes(5000), name: "a.jpg" }, { bytes: jpegBytes(3000), name: "b.jpg" }] });
    expect(r.ok && r.photos).toBe(2);
    const b = [...store.bookings.values()][0];
    expect(b.photos).toHaveLength(2);
    expect(b.photos[0].path).toMatch(/^booking-uploads\/[a-f0-9]+\/1\.jpg$/);
    expect(store.photos.size).toBe(2);
  });

  it("rejects an unknown service id", async () => {
    const r = await run({ fields: validFields("does-not-exist") });
    expect(r).toMatchObject({ ok: false, status: 400, fieldErrors: { serviceId: expect.any(String) } });
    expect(store.bookings.size).toBe(0);
  });

  it("rejects a closed-day date with a field error", async () => {
    const r = await run({ fields: validFields("clutch-repair", { preferredDate: nextDay("sun") }) });
    expect(r).toMatchObject({ ok: false, fieldErrors: { preferredDate: expect.stringMatching(/closed/) } });
  });

  it("returns all field errors at once", async () => {
    const r = await run({ fields: { ...validFields(), email: "nope", vrm: "", phone: "123" } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fieldErrors ?? {}).sort()).toEqual(["email", "phone", "vrm"]);
  });

  it("silently discards honeypot submissions", async () => {
    const r = await run({ fields: { ...validFields(), website: "http://spam.example" } });
    expect(r.ok).toBe(true);
    expect(store.bookings.size).toBe(0);
  });

  it("rate limits per IP", async () => {
    for (let i = 0; i < BOOKING_RATE_LIMIT.limit; i++) expect((await run()).ok).toBe(true);
    const blocked = await run();
    expect(blocked).toMatchObject({ ok: false, status: 429, code: "rate_limited" });
    expect((await run({ ipHash: "other-ip" })).ok).toBe(true);
    expect(store.bookings.size).toBe(BOOKING_RATE_LIMIT.limit + 1);
  });

  it("rejects non-image content even with an image-looking name", async () => {
    const fake = new TextEncoder().encode("<script>alert(1)</script>".padEnd(500, " "));
    const r = await run({ photos: [{ bytes: fake, name: "evil.jpg" }] });
    expect(r).toMatchObject({ ok: false, fieldErrors: { photos: expect.stringMatching(/JPEG, PNG or WebP/) } });
    expect(store.bookings.size).toBe(0);
    expect(store.photos.size).toBe(0);
  });

  it("enforces photo count and size limits", async () => {
    const four = Array.from({ length: 4 }, (_, i) => ({ bytes: jpegBytes(1000), name: `${i}.jpg` }));
    expect(await run({ photos: four })).toMatchObject({ ok: false, fieldErrors: { photos: expect.stringMatching(/no more than 3/) } });
    expect(await run({ photos: [{ bytes: jpegBytes(1_600_000), name: "big.jpg" }] })).toMatchObject({
      ok: false, fieldErrors: { photos: expect.stringMatching(/1\.5 MB/) },
    });
    const three = Array.from({ length: 3 }, (_, i) => ({ bytes: jpegBytes(1_450_000), name: `${i}.jpg` }));
    expect(await run({ photos: three })).toMatchObject({ ok: false, fieldErrors: { photos: expect.stringMatching(/in total/) } });
  });

  it("fails cleanly, saves nothing and leaves no orphans when photo upload fails", async () => {
    store.failNext.upload = true;
    const r = await run({ photos: [{ bytes: jpegBytes(), name: "a.jpg" }] });
    expect(r).toMatchObject({ ok: false, status: 502, code: "photo_upload_failed" });
    expect(store.bookings.size).toBe(0);
    expect(store.photos.size).toBe(0);
  });

  it("removes uploaded photos when the booking write fails", async () => {
    store.failNext.save = true;
    const r = await run({ photos: [{ bytes: jpegBytes(), name: "a.jpg" }, { bytes: jpegBytes(), name: "b.jpg" }] });
    expect(r).toMatchObject({ ok: false, status: 500, code: "save_failed" });
    expect(store.bookings.size).toBe(0);
    expect(store.photos.size).toBe(0);
  });

  it("logs failures without leaking customer details", async () => {
    const spy = vi.spyOn(console, "error");
    store.failNext.save = true;
    await run();
    const logged = spy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toContain("booking.save");
    for (const pii of ["alex@example.com", "Alex", "07700", "AB21CDE", "Warning light"]) expect(logged).not.toContain(pii);
  });
});
