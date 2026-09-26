import "server-only";
import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
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
import { businessId } from "@/lib/env";
import { getBucket, getDb } from "@/lib/firebase/admin";
import { logServerError } from "@/lib/logger";
import type { DataStore, RateLimitResult } from "./types";

/**
 * Hard ceiling on any public list query. Pages are ISR-cached (revalidate 60s), so this
 * bounds reads per regeneration; list pages paginate what they render. Raise it (or
 * move to cursor pagination) if a collection ever approaches this size.
 */
export const MAX_PUBLIC_ITEMS = 1000;

/** Parses documents defensively: one malformed doc must not take down the page. */
function parseDocs<T>(
  scope: string,
  docs: { id: string; data: () => Record<string, unknown> }[],
  parse: (raw: unknown) => { success: true; data: T } | { success: false; error: Error },
): T[] {
  const out: T[] = [];
  for (const d of docs) {
    const res = parse({ ...d.data(), id: d.id });
    if (res.success) out.push(res.data);
    else logServerError(scope, res.error, { docId: d.id });
  }
  return out;
}

export class FirestoreStore implements DataStore {
  readonly kind = "firestore" as const;

  async getSettings(): Promise<BusinessSettings | null> {
    const snap = await getDb().collection("settings").doc(businessId()).get();
    if (!snap.exists) return null;
    const res = businessSettingsSchema.safeParse(snap.data());
    if (!res.success) {
      logServerError("settings.parse", res.error, { docId: snap.id });
      return null;
    }
    return res.data;
  }

  async listCategories(): Promise<ServiceCategory[]> {
    const snap = await getDb()
      .collection("serviceCategories")
      .where("businessId", "==", businessId())
      .where("status", "==", "published")
      .get();
    return parseDocs("categories.parse", snap.docs, (r) => serviceCategorySchema.safeParse(r)).sort(
      (a, b) => a.order - b.order,
    );
  }

  async listServices(): Promise<Service[]> {
    const snap = await getDb()
      .collection("services")
      .where("businessId", "==", businessId())
      .where("status", "==", "published")
      .get();
    return parseDocs("services.parse", snap.docs, (r) => serviceSchema.safeParse(r)).sort(
      (a, b) => a.order - b.order,
    );
  }

  async listGuides(): Promise<Guide[]> {
    const snap = await getDb()
      .collection("guides")
      .where("businessId", "==", businessId())
      .where("status", "==", "published")
      .limit(MAX_PUBLIC_ITEMS)
      .get();
    return parseDocs("guides.parse", snap.docs, (r) => guideSchema.safeParse(r)).sort((a, b) =>
      (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
    );
  }

  async getGuideBySlug(slug: string): Promise<Guide | null> {
    const snap = await getDb()
      .collection("guides")
      .where("businessId", "==", businessId())
      .where("status", "==", "published")
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const res = guideSchema.safeParse({ ...snap.docs[0].data(), id: snap.docs[0].id });
    if (!res.success) {
      logServerError("guide.parse", res.error, { docId: snap.docs[0].id });
      return null;
    }
    return res.data;
  }

  async listFaultCodes(): Promise<FaultCode[]> {
    const snap = await getDb()
      .collection("faultCodes")
      .where("businessId", "==", businessId())
      .where("status", "==", "published")
      .limit(MAX_PUBLIC_ITEMS)
      .get();
    return parseDocs("faultCodes.parse", snap.docs, (r) => faultCodeSchema.safeParse(r)).sort((a, b) =>
      a.code.localeCompare(b.code),
    );
  }

  async getFaultCodeByCode(code: string): Promise<FaultCode | null> {
    const snap = await getDb()
      .collection("faultCodes")
      .where("businessId", "==", businessId())
      .where("status", "==", "published")
      .where("code", "==", code.toUpperCase())
      .limit(1)
      .get();
    if (snap.empty) return null;
    const res = faultCodeSchema.safeParse({ ...snap.docs[0].data(), id: snap.docs[0].id });
    if (!res.success) {
      logServerError("faultCode.parse", res.error, { docId: snap.docs[0].id });
      return null;
    }
    return res.data;
  }

  async listVideos(): Promise<Video[]> {
    const snap = await getDb()
      .collection("videos")
      .where("businessId", "==", businessId())
      .where("status", "==", "published")
      .limit(MAX_PUBLIC_ITEMS)
      .get();
    return parseDocs("videos.parse", snap.docs, (r) => videoSchema.safeParse(r)).sort((a, b) =>
      (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
    );
  }

  async getVideoBySlug(slug: string): Promise<Video | null> {
    const snap = await getDb()
      .collection("videos")
      .where("businessId", "==", businessId())
      .where("status", "==", "published")
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const res = videoSchema.safeParse({ ...snap.docs[0].data(), id: snap.docs[0].id });
    if (!res.success) {
      logServerError("video.parse", res.error, { docId: snap.docs[0].id });
      return null;
    }
    return res.data;
  }

  async listContentCategories(): Promise<ContentCategory[]> {
    const snap = await getDb()
      .collection("categories")
      .where("businessId", "==", businessId())
      .where("status", "==", "published")
      .limit(MAX_PUBLIC_ITEMS)
      .get();
    return parseDocs("contentCategories.parse", snap.docs, (r) => contentCategorySchema.safeParse(r)).sort(
      (a, b) => a.order - b.order,
    );
  }

  newBookingId(): string {
    return getDb().collection("bookings").doc().id;
  }

  async saveBooking(id: string, record: BookingRecord): Promise<void> {
    await getDb()
      .collection("bookings")
      .doc(id)
      .create({ ...record, createdAt: FieldValue.serverTimestamp() });
  }

  async uploadBookingPhoto(
    bookingId: string,
    index: number,
    bytes: Uint8Array,
    contentType: string,
    extension: string,
  ): Promise<StoredPhoto> {
    const path = `booking-uploads/${bookingId}/${index + 1}.${extension}`;
    await getBucket()
      .file(path)
      .save(Buffer.from(bytes), {
        resumable: false,
        contentType,
        metadata: { cacheControl: "private, max-age=0, no-store" },
      });
    return { path, contentType, size: bytes.byteLength };
  }

  async deleteBookingPhotos(paths: string[]): Promise<void> {
    await Promise.all(
      paths.map((p) =>
        getBucket()
          .file(p)
          .delete({ ignoreNotFound: true }),
      ),
    );
  }

  /**
   * Fixed-window counter in `rateLimits/{hash}`. Configure a Firestore TTL policy
   * on `expiresAt` so old windows are removed automatically.
   */
  async hitRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
    now: Date = new Date(),
  ): Promise<RateLimitResult> {
    const db = getDb();
    const ref = db
      .collection("rateLimits")
      .doc(createHash("sha256").update(key).digest("hex").slice(0, 40));
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() as
        | { count: number; windowStart: Timestamp }
        | undefined;
      const startMs = data?.windowStart?.toMillis() ?? 0;
      const expired = !data || now.getTime() - startMs >= windowSeconds * 1000;
      if (expired) {
        tx.set(ref, {
          count: 1,
          windowStart: Timestamp.fromDate(now),
          expiresAt: Timestamp.fromMillis(now.getTime() + windowSeconds * 2000),
        });
        return { allowed: true, remaining: limit - 1 };
      }
      if (data!.count >= limit) return { allowed: false, remaining: 0 };
      tx.update(ref, { count: FieldValue.increment(1) });
      return { allowed: true, remaining: limit - data!.count - 1 };
    });
  }
}
