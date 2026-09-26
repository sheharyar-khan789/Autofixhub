import { randomInt } from "node:crypto";
import { businessId, isNotConfigured } from "@/lib/env";
import { logServerError, logServerWarn } from "@/lib/logger";
import type { BookingRecord, BusinessSettings, StoredPhoto } from "@/lib/models";
import type { DataStore } from "@/lib/repo/types";
import { bookingInputSchema, flattenZodErrors, rawBookingFromFields } from "@/lib/validation/booking";
import {
  MAX_PHOTOS,
  MAX_PHOTO_BYTES,
  MAX_TOTAL_PHOTO_BYTES,
  PHOTO_EXTENSIONS,
  sniffImageType,
} from "@/lib/validation/photos";
import { validatePreferredDate } from "@/lib/validation/uk";

export const PRIVACY_NOTICE_VERSION = "placeholder-0";
export const BOOKING_RATE_LIMIT = { limit: 5, windowSeconds: 3600 } as const;

export interface UploadedPhotoInput {
  bytes: Uint8Array;
  name: string;
}

export type BookingResult =
  | { ok: true; reference: string; photos: number }
  | {
      ok: false;
      status: 400 | 413 | 429 | 500 | 502;
      code:
        | "validation"
        | "photos_invalid"
        | "rate_limited"
        | "photo_upload_failed"
        | "save_failed"
        | "service_unavailable";
      message: string;
      fieldErrors?: Record<string, string>;
    };

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
export function generateReference(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `BK-${s}`;
}

export interface CreateBookingArgs {
  fields: Record<string, string | undefined>;
  photos: UploadedPhotoInput[];
  ipHash: string;
  settings: BusinessSettings | null;
  now?: Date;
}

export async function createBooking(store: DataStore, args: CreateBookingArgs): Promise<BookingResult> {
  const now = args.now ?? new Date();

  // Honeypot: real users never see or fill this field. Pretend success, store nothing.
  if ((args.fields.website ?? "").trim() !== "") {
    logServerWarn("booking.honeypot", "honeypot field filled; submission discarded", {
      ipHash: args.ipHash,
    });
    return { ok: true, reference: generateReference(), photos: 0 };
  }

  const rl = await store
    .hitRateLimit(`booking:${args.ipHash}`, BOOKING_RATE_LIMIT.limit, BOOKING_RATE_LIMIT.windowSeconds, now)
    .catch((err) => {
      if (isNotConfigured(err)) throw err; // surfaced as 503 by the route
      // Fail closed on the limiter would lock everyone out if Firestore blips;
      // the limiter is a brake, not a gate, so allow but log loudly.
      logServerError("booking.ratelimit", err, { ipHash: args.ipHash });
      return { allowed: true, remaining: 0 };
    });
  if (!rl.allowed) {
    return {
      ok: false,
      status: 429,
      code: "rate_limited",
      message: "Too many booking requests from this connection. Try again later or call the workshop.",
    };
  }

  const parsed = bookingInputSchema.safeParse(rawBookingFromFields(args.fields));
  const fieldErrors = parsed.success ? {} : flattenZodErrors(parsed.error);

  if (parsed.success) {
    const dateError = validatePreferredDate(parsed.data.preferredDate, args.settings, now);
    if (dateError) fieldErrors.preferredDate = dateError;
  }

  // Photos are validated by content, not by the client-declared type.
  const sniffed: { bytes: Uint8Array; type: NonNullable<ReturnType<typeof sniffImageType>> }[] = [];
  if (args.photos.length > MAX_PHOTOS) {
    fieldErrors.photos = `Attach no more than ${MAX_PHOTOS} photos.`;
  } else {
    let total = 0;
    for (const p of args.photos) {
      total += p.bytes.byteLength;
      if (p.bytes.byteLength === 0 || p.bytes.byteLength > MAX_PHOTO_BYTES) {
        fieldErrors.photos = "Each photo must be under 1.5 MB.";
        break;
      }
      const type = sniffImageType(p.bytes);
      if (!type) {
        fieldErrors.photos = "Photos must be JPEG, PNG or WebP images.";
        break;
      }
      sniffed.push({ bytes: p.bytes, type });
    }
    if (!fieldErrors.photos && total > MAX_TOTAL_PHOTO_BYTES) {
      fieldErrors.photos = "Photos are too large in total. Attach fewer or smaller photos.";
    }
  }

  if (!parsed.success || Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      status: fieldErrors.photos && parsed.success && Object.keys(fieldErrors).length === 1 ? 413 : 400,
      code: fieldErrors.photos && Object.keys(fieldErrors).length === 1 ? "photos_invalid" : "validation",
      message: "Check the highlighted fields and try again.",
      fieldErrors,
    };
  }
  const input = parsed.data;

  // The service must exist and be published: never trust a client-supplied id.
  let serviceSnapshot: BookingRecord["serviceSnapshot"];
  try {
    const [services, categories] = await Promise.all([store.listServices(), store.listCategories()]);
    const svc = services.find((s) => s.id === input.serviceId && s.bookable);
    if (!svc) {
      return {
        ok: false,
        status: 400,
        code: "validation",
        message: "Check the highlighted fields and try again.",
        fieldErrors: { serviceId: "Choose a service from the list." },
      };
    }
    serviceSnapshot = {
      name: svc.name,
      slug: svc.slug,
      categoryName: categories.find((c) => c.id === svc.categoryId)?.name ?? "",
    };
  } catch (err) {
    if (isNotConfigured(err)) throw err;
    logServerError("booking.service-lookup", err);
    return {
      ok: false,
      status: 500,
      code: "service_unavailable",
      message: "The booking system is temporarily unavailable. Please call the workshop.",
    };
  }

  const bookingId = store.newBookingId();
  const uploaded: StoredPhoto[] = [];
  try {
    for (let i = 0; i < sniffed.length; i++) {
      uploaded.push(
        await store.uploadBookingPhoto(
          bookingId,
          i,
          sniffed[i].bytes,
          sniffed[i].type,
          PHOTO_EXTENSIONS[sniffed[i].type],
        ),
      );
    }
  } catch (err) {
    logServerError("booking.photo-upload", err, { bookingId });
    await store.deleteBookingPhotos(uploaded.map((p) => p.path)).catch((e) =>
      logServerError("booking.photo-cleanup", e, { bookingId }),
    );
    return {
      ok: false,
      status: 502,
      code: "photo_upload_failed",
      message: "Your photos could not be uploaded, so nothing was saved. Try again, or send the request without photos.",
    };
  }

  const reference = generateReference();
  const record: BookingRecord = {
    reference,
    businessId: businessId(),
    status: "new",
    serviceId: input.serviceId,
    serviceSnapshot,
    customer: { name: input.name, phone: input.phone, email: input.email },
    vehicle: { vrm: input.vrm, make: input.make, model: input.model, source: "manual" },
    symptoms: input.description,
    preferred: { date: input.preferredDate, timeWindow: input.preferredTime },
    consent: { privacyAcceptedAt: now.toISOString(), privacyNoticeVersion: PRIVACY_NOTICE_VERSION },
    photos: uploaded,
    source: "web",
    ipHash: args.ipHash,
    schemaVersion: 1,
    notes: [],
    statusUpdatedAt: null,
  };

  try {
    await store.saveBooking(bookingId, record);
  } catch (err) {
    logServerError("booking.save", err, { bookingId });
    await store.deleteBookingPhotos(uploaded.map((p) => p.path)).catch((e) =>
      logServerError("booking.photo-cleanup", e, { bookingId }),
    );
    return {
      ok: false,
      status: 500,
      code: "save_failed",
      message: "Your booking request could not be saved. Please try again, or call the workshop.",
    };
  }

  return { ok: true, reference, photos: uploaded.length };
}
