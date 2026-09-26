import { randomBytes } from "node:crypto";
import contentCategoriesSeed from "../../../data/seed/categories.json";
import faultCodesSeed from "../../../data/seed/fault-codes.json";
import guidesSeed from "../../../data/seed/guides.json";
import serviceCategoriesSeed from "../../../data/seed/service-categories.json";
import servicesSeed from "../../../data/seed/services.json";
import videosSeed from "../../../data/seed/videos.json";
import contentFixture from "../../../tests/fixtures/content.fixture.json";
import settingsFixture from "../../../tests/fixtures/settings.fixture.json";
import {
  businessSettingsSchema,
  contentCategorySchema,
  faultCodeSchema,
  guideSchema,
  serviceCategorySchema,
  serviceSchema,
  videoSchema,
  type BookingRecord,
  type BusinessSettings,
  type ContentCategory,
  type FaultCode,
  type Guide,
  type Service,
  type ServiceCategory,
  type StoredPhoto,
  type Video,
} from "@/lib/models";
import type { DataStore, RateLimitResult } from "./types";

/**
 * In-memory DataStore for development and automated tests ONLY.
 * Refused in production by `dataSource()` in env.ts. The fixture settings are
 * obviously fictional (Ofcom drama-range numbers, example.com).
 */
export class MemoryStore implements DataStore {
  readonly kind = "memory" as const;
  bookings = new Map<string, BookingRecord & { createdAt: Date }>();
  photos = new Map<string, { bytes: Uint8Array; contentType: string }>();
  private windows = new Map<string, { count: number; start: number }>();
  private settings: BusinessSettings | null;
  private categories: ServiceCategory[];
  private services: Service[];
  private guides: Guide[];
  private faultCodes: FaultCode[];
  private videos: Video[];
  private contentCategories: ContentCategory[];
  /** Test hook: make the next save/upload fail. */
  failNext: { save?: boolean; upload?: boolean } = {};

  constructor(opts: { settings?: BusinessSettings | null } = {}) {
    this.settings =
      opts.settings === undefined
        ? businessSettingsSchema.parse(settingsFixture)
        : opts.settings;
    this.categories = serviceCategoriesSeed.map((c) => serviceCategorySchema.parse(c));
    this.contentCategories = contentCategoriesSeed.map((c) => contentCategorySchema.parse(c));
    // Fixture content is all treated as published in memory mode so dev/tests can browse it.
    this.services = servicesSeed.map((s) => serviceSchema.parse({ ...s, status: "published" }));
    // guides.json/videos.json (the real seed) start empty. In memory mode they are
    // topped up with the clearly-fictional content fixture, which keeps each item's own
    // status so tests can prove drafts never appear publicly.
    this.guides = [
      ...(guidesSeed as Record<string, unknown>[]).map((g) => guideSchema.parse({ ...g, status: "published" })),
      ...contentFixture.guides.map((g) => guideSchema.parse(g)),
    ];
    this.faultCodes = faultCodesSeed.map((f) => faultCodeSchema.parse({ ...f, status: "published" }));
    this.videos = [
      ...(videosSeed as Record<string, unknown>[]).map((v) => videoSchema.parse({ ...v, status: "published" })),
      ...contentFixture.videos.map((v) => videoSchema.parse(v)),
    ];
  }

  async getSettings() {
    return this.settings;
  }
  async listCategories() {
    return this.categories.filter((c) => c.status === "published").sort((a, b) => a.order - b.order);
  }
  async listServices() {
    return this.services.filter((s) => s.status === "published").sort((a, b) => a.order - b.order);
  }
  async listGuides() {
    return this.guides
      .filter((g) => g.status === "published")
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  }
  async getGuideBySlug(slug: string) {
    return this.guides.find((g) => g.status === "published" && g.slug === slug) ?? null;
  }
  async listFaultCodes() {
    return this.faultCodes.filter((f) => f.status === "published").sort((a, b) => a.code.localeCompare(b.code));
  }
  async getFaultCodeByCode(code: string) {
    const upper = code.toUpperCase();
    return this.faultCodes.find((f) => f.status === "published" && f.code === upper) ?? null;
  }
  async listVideos() {
    return this.videos
      .filter((v) => v.status === "published")
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  }
  async getVideoBySlug(slug: string) {
    return this.videos.find((v) => v.status === "published" && v.slug === slug) ?? null;
  }
  async listContentCategories() {
    return this.contentCategories.filter((c) => c.status === "published").sort((a, b) => a.order - b.order);
  }
  newBookingId() {
    return randomBytes(10).toString("hex");
  }
  async saveBooking(id: string, record: BookingRecord) {
    if (this.failNext.save) {
      this.failNext.save = false;
      throw Object.assign(new Error("simulated Firestore write failure"), { code: "unavailable" });
    }
    if (this.bookings.has(id)) throw new Error("already exists");
    this.bookings.set(id, { ...record, createdAt: new Date() });
  }
  async uploadBookingPhoto(
    bookingId: string,
    index: number,
    bytes: Uint8Array,
    contentType: string,
    extension: string,
  ): Promise<StoredPhoto> {
    if (this.failNext.upload) {
      this.failNext.upload = false;
      throw Object.assign(new Error("simulated Storage failure"), { code: "storage/unknown" });
    }
    const path = `booking-uploads/${bookingId}/${index + 1}.${extension}`;
    this.photos.set(path, { bytes, contentType });
    return { path, contentType, size: bytes.byteLength };
  }
  async deleteBookingPhotos(paths: string[]) {
    for (const p of paths) this.photos.delete(p);
  }
  async hitRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
    now: Date = new Date(),
  ): Promise<RateLimitResult> {
    const w = this.windows.get(key);
    if (!w || now.getTime() - w.start >= windowSeconds * 1000) {
      this.windows.set(key, { count: 1, start: now.getTime() });
      return { allowed: true, remaining: limit - 1 };
    }
    if (w.count >= limit) return { allowed: false, remaining: 0 };
    w.count += 1;
    return { allowed: true, remaining: limit - w.count };
  }
}
