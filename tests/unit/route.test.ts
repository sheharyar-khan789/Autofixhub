import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/bookings/route";
import { __setStoreForTests } from "@/lib/repo";
import { MemoryStore } from "@/lib/repo/memory";
import { jpegBytes, validFields } from "./helpers";

const URL_ = "http://localhost:3000/api/bookings";
let store: MemoryStore;

function formReq(fields: Record<string, string>, photos: Uint8Array[] = [], headers: Record<string, string> = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  photos.forEach((p, i) => fd.append("photos", new Blob([p as BlobPart], { type: "image/jpeg" }), `p${i}.jpg`));
  return new Request(URL_, {
    method: "POST",
    body: fd,
    headers: { origin: "http://localhost:3000", "x-forwarded-for": "203.0.113.9", ...headers },
  });
}

beforeEach(() => {
  // The booking API is a dormant workshop feature; these tests exercise it switched on.
  vi.stubEnv("WORKSHOP_FEATURES_ENABLED", "true");
  store = new MemoryStore();
  __setStoreForTests(store);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  __setStoreForTests(undefined);
  vi.unstubAllEnvs();
});

describe("POST /api/bookings", () => {
  it("is disabled (404, nothing stored) unless WORKSHOP_FEATURES_ENABLED is exactly \"true\"", async () => {
    for (const v of ["", "false", "1", "TRUE"]) {
      vi.stubEnv("WORKSHOP_FEATURES_ENABLED", v);
      const res = await POST(formReq(validFields(), [jpegBytes(4000)]));
      expect(res.status, v).toBe(404);
    }
    expect(store.bookings.size).toBe(0);
    expect(store.photos.size).toBe(0);
  });

  it("creates a booking (201) with photos", async () => {
    const res = await POST(formReq(validFields(), [jpegBytes(4000)]));
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, photos: 1 });
    expect(body.reference).toMatch(/^BK-/);
    expect(store.bookings.size).toBe(1);
    expect(store.photos.size).toBe(1);
    const stored = [...store.bookings.values()][0];
    expect(stored.ipHash).toMatch(/^[a-f0-9]{32}$/);
    expect(JSON.stringify(stored)).not.toContain("203.0.113.9"); // raw IP never stored
  });

  it("rejects requests without a same-site Origin (403)", async () => {
    const noOrigin = new Request(URL_, { method: "POST", body: new FormData() });
    expect((await POST(noOrigin)).status).toBe(403);
    const evil = formReq(validFields(), [], { origin: "https://evil.example" });
    expect((await POST(evil)).status).toBe(403);
    expect(store.bookings.size).toBe(0);
  });

  it("returns 400 with per-field errors", async () => {
    const res = await POST(formReq({ ...validFields(), email: "bad" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, code: "validation", fieldErrors: { email: expect.any(String) } });
  });

  it("returns 413 for an oversized declared body", async () => {
    const res = await POST(formReq(validFields(), [], { "content-length": "9000000" }));
    expect(res.status).toBe(413);
  });

  it("rejects more than the allowed number of photos (413) and stores nothing", async () => {
    const res = await POST(formReq(validFields(), [jpegBytes(), jpegBytes(), jpegBytes(), jpegBytes()]));
    expect(res.status).toBe(413);
    expect((await res.json()).fieldErrors.photos).toMatch(/no more than 3/);
    expect(store.bookings.size).toBe(0);
    expect(store.photos.size).toBe(0);
  });

  it("returns 429 with Retry-After after the limit", async () => {
    for (let i = 0; i < 5; i++) expect((await POST(formReq(validFields()))).status).toBe(201);
    const res = await POST(formReq(validFields()));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("3600");
  });

  it("returns 502 and stores nothing when Storage fails", async () => {
    store.failNext.upload = true;
    const res = await POST(formReq(validFields(), [jpegBytes()]));
    expect(res.status).toBe(502);
    expect(store.bookings.size).toBe(0);
  });

  it("returns a clear 503 when Firebase is not configured", async () => {
    __setStoreForTests(undefined);
    vi.stubEnv("DATA_SOURCE", "firestore");
    for (const k of ["FIREBASE_ADMIN_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY"]) vi.stubEnv(k, "");
    const res = await POST(formReq(validFields()));
    expect(res.status).toBe(503);
    expect((await res.json()).message).toMatch(/not available/i);
  });
});
