import type {
  BookingRecord,
  BusinessSettings,
  ContentCategory,
  FaultCode,
  Guide,
  Service,
  ServiceCategory,
  StoredPhoto,
  Video,
} from "@/lib/models";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Everything the app needs from persistence. Implemented by Firestore/Storage
 * (production) and by an in-memory fixture (development and tests only).
 */
export interface DataStore {
  readonly kind: "firestore" | "memory";
  getSettings(): Promise<BusinessSettings | null>;
  /** Published SERVICE categories (dormant booking catalogue), ordered by `order`. */
  listCategories(): Promise<ServiceCategory[]>;
  /** Published services (dormant booking catalogue), ordered by `order`. */
  listServices(): Promise<Service[]>;
  /** Published repair guides, newest first. */
  listGuides(): Promise<Guide[]>;
  getGuideBySlug(slug: string): Promise<Guide | null>;
  /** Published fault codes. */
  listFaultCodes(): Promise<FaultCode[]>;
  getFaultCodeByCode(code: string): Promise<FaultCode | null>;
  /** Published videos, newest first. */
  listVideos(): Promise<Video[]>;
  getVideoBySlug(slug: string): Promise<Video | null>;
  /** Published content categories (vehicle groups and topics), ordered by `order`. */
  listContentCategories(): Promise<ContentCategory[]>;
  newBookingId(): string;
  saveBooking(id: string, record: BookingRecord): Promise<void>;
  uploadBookingPhoto(
    bookingId: string,
    index: number,
    bytes: Uint8Array,
    contentType: string,
    extension: string,
  ): Promise<StoredPhoto>;
  deleteBookingPhotos(paths: string[]): Promise<void>;
  hitRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
    now?: Date,
  ): Promise<RateLimitResult>;
}
