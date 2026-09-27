import { z } from "zod";

export const ROLES = ["owner", "manager", "technician", "editor"] as const;
export type Role = (typeof ROLES)[number];

export const TIME_WINDOWS = ["morning", "afternoon", "no-preference"] as const;
export type TimeWindow = (typeof TIME_WINDOWS)[number];
export const TIME_WINDOW_LABELS: Record<TimeWindow, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  "no-preference": "No preference",
};

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];
export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const httpsUrl = z
  .url()
  .refine((u) => u.startsWith("https://"), { message: "Must be an https:// link." });

export const openingDaySchema = z.object({
  day: z.enum(DAY_KEYS),
  closed: z.boolean().optional(),
  open: hhmm.optional(),
  close: hhmm.optional(),
});

export const socialLinksSchema = z.object({
  facebook: httpsUrl.optional(),
  instagram: httpsUrl.optional(),
  tiktok: httpsUrl.optional(),
  x: httpsUrl.optional(),
  youtube: httpsUrl.optional(),
});

/**
 * settings/{businessId}. Every field is optional on purpose: the site must
 * never invent business facts, so absent values render as placeholders/hidden.
 */
export const businessSettingsSchema = z.object({
  tradingName: z.string().min(1).max(120).optional(),
  logoUrl: httpsUrl.optional(),
  socialLinks: socialLinksSchema.optional(),
  legalName: z.string().min(1).max(160).optional(),
  companyNumber: z.string().max(20).optional(),
  vatNumber: z.string().max(20).optional(),
  phone: z.string().max(30).optional(),
  /** International format, digits only or with leading + (e.g. +447700900123) */
  whatsapp: z.string().regex(/^\+?[1-9]\d{7,14}$/).optional(),
  email: z.email().max(254).optional(),
  address: z
    .object({
      line1: z.string().min(1).max(120),
      line2: z.string().max(120).optional(),
      city: z.string().min(1).max(80),
      postcode: z.string().min(3).max(10),
    })
    .optional(),
  mapsUrl: httpsUrl.optional(),
  openingHours: z.array(openingDaySchema).max(7).optional(),
  hoursNote: z.string().max(300).optional(),
  accreditations: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        body: z.string().max(120).optional(),
        referenceNumber: z.string().max(60).optional(),
        verified: z.boolean(),
      }),
    )
    .max(20)
    .optional(),
  whyChooseUs: z
    .array(z.object({ title: z.string().min(1).max(80), text: z.string().min(1).max(400) }))
    .max(6)
    .optional(),
  googleReviewsUrl: httpsUrl.optional(),
  featuredVideoYoutubeId: z.string().regex(/^[\w-]{11}$/).optional(),
  /** Optional caption under the hero animation, e.g. an affiliation disclaimer. */
  heroCaption: z.string().max(200).optional(),
  about: z
    .object({
      story: z.string().max(4000).optional(),
      experience: z.string().max(2000).optional(),
      workshop: z.string().max(2000).optional(),
      equipment: z.array(z.string().min(1).max(120)).max(30).optional(),
      team: z
        .array(
          z.object({
            name: z.string().min(1).max(80),
            role: z.string().min(1).max(80),
            bio: z.string().max(600).optional(),
          }),
        )
        .max(20)
        .optional(),
    })
    .optional(),
});
export type BusinessSettings = z.infer<typeof businessSettingsSchema>;

export const PUBLISH_STATUSES = ["draft", "published", "archived"] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

export const serviceCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(400).optional(),
  order: z.number().int(),
  iconKey: z.string().max(40).optional(),
  status: z.enum(PUBLISH_STATUSES),
});
export type ServiceCategory = z.infer<typeof serviceCategorySchema>;

export const serviceSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: z.string().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  summary: z.string().min(1).max(300),
  body: z.string().max(8000).optional(),
  image: z.string().max(500).optional(),
  priceMode: z.enum(["quote", "from", "fixed"]).default("quote"),
  pricePence: z.number().int().nonnegative().optional(),
  vatIncluded: z.boolean().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  bookable: z.boolean().default(true),
  order: z.number().int(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  status: z.enum(PUBLISH_STATUSES),
});
export type Service = z.infer<typeof serviceSchema>;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/**
 * OBD fault code: P, B, C or U, then either the standard 4 characters (hex, so
 * hybrid/manufacturer codes like P0A80 fit) or a 6-digit manufacturer code (P268172).
 */
const faultCodePattern = /^[PBCU](?:[0-9A-F]{4}|\d{6})$/i;
const faultCodeMessage = "Use P, B, C or U followed by 4 characters (e.g. P0420, P0A80) or 6 digits (e.g. P268172).";
const faultCode = z.string().regex(faultCodePattern, faultCodeMessage).transform((c) => c.toUpperCase());
const youtubeIdPattern = /^[\w-]{11}$/;
const categorySlugs = z.array(z.string().regex(slugPattern)).max(12).optional();
const textList = (max: number) => z.array(z.string().min(1).max(max)).max(20).optional();

/** YYYY-MM-DD (a real calendar date is not enforced here; admin input is a date picker). */
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const FUEL_TYPES = ["diesel", "petrol", "hybrid", "plug-in-hybrid", "electric", "other"] as const;
export type FuelType = (typeof FUEL_TYPES)[number];
export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  diesel: "Diesel",
  petrol: "Petrol",
  hybrid: "Hybrid",
  "plug-in-hybrid": "Plug-in hybrid",
  electric: "Electric",
  other: "Other",
};

export const CATEGORY_KINDS = ["vehicle", "topic"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

/**
 * categories/{id}. The content taxonomy (vehicle groups such as "Volkswagen Group",
 * and topics such as "DPF" or "Wiring"). Guides, fault codes and videos reference
 * categories by slug in `categorySlugs`. A category page is only public when it is
 * published AND has at least one published item, so no empty SEO pages exist.
 */
export const contentCategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  slug: z.string().regex(slugPattern),
  kind: z.enum(CATEGORY_KINDS).default("topic"),
  description: z.string().max(400).optional(),
  order: z.number().int().default(0),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  status: z.enum(PUBLISH_STATUSES),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type ContentCategory = z.infer<typeof contentCategorySchema>;

export const faqEntrySchema = z.object({
  question: z.string().min(1).max(200),
  answer: z.string().min(1).max(2000),
});
export type FaqEntry = z.infer<typeof faqEntrySchema>;

/**
 * guides/{id}. A repair guide written by the workshop. `content` is plain text
 * split into paragraphs by the renderer (no HTML/markdown parser required).
 * Every relation field stores an id/code/slug the site resolves at render time,
 * so a broken reference simply fails to render rather than showing stale text.
 */
export const guideSchema = z.object({
  id: z.string(),
  slug: z.string().regex(slugPattern),
  title: z.string().min(1).max(160),
  excerpt: z.string().min(1).max(300),
  content: z.string().min(1).max(20000),
  featuredImage: z.string().max(500).optional(),
  vehicleMake: z.string().max(60).optional(),
  vehicleModel: z.string().max(60).optional(),
  vehicleYearFrom: z.number().int().min(1950).max(2100).optional(),
  vehicleYearTo: z.number().int().min(1950).max(2100).optional(),
  vehicleGeneration: z.string().max(60).optional(),
  engine: z.string().max(80).optional(),
  fuelType: z.enum(FUEL_TYPES).optional(),
  /** System / component, e.g. "DPF" or "Gearbox" (shown as the guide's label). */
  problemCategory: z.string().max(80).optional(),
  symptoms: z.array(z.string().min(1).max(200)).max(20).optional(),
  possibleCauses: z.array(z.string().min(1).max(200)).max(20).optional(),
  recommendedChecks: z.array(z.string().min(1).max(200)).max(20).optional(),
  /** Diagnostic information, plain text (paragraphs separated by a blank line). */
  diagnosis: z.string().max(8000).optional(),
  /** Repair information, plain text. Only what the author actually knows; no invented procedures. */
  repairInfo: z.string().max(8000).optional(),
  /** Important notes / safety warnings. */
  warnings: textList(300),
  relatedServiceIds: z.array(z.string()).max(12).optional(),
  relatedFaultCodes: z.array(faultCode).max(12).optional(),
  relatedVideoIds: z.array(z.string()).max(12).optional(),
  relatedGuideSlugs: z.array(z.string().regex(slugPattern)).max(12).optional(),
  categorySlugs,
  /** A YouTube video for this guide, pasted by the author (no separate video record needed). */
  youtubeVideoId: z.string().regex(youtubeIdPattern).optional(),
  faqs: z.array(faqEntrySchema).max(15).optional(),
  publishedAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  author: z.string().max(100).optional(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  /** Only for content first published elsewhere; defaults to this guide's own URL. */
  canonicalUrl: httpsUrl.optional(),
  ogImage: z.string().max(500).optional(),
  /** Keep a published guide out of search engines (and the sitemap). */
  noindex: z.boolean().optional(),
  order: z.number().int().optional(),
  status: z.enum(PUBLISH_STATUSES),
});
export type Guide = z.infer<typeof guideSchema>;

/**
 * faultCodes/{id}. `scope` marks whether `meaning` is the generic SAE
 * definition (may not hold on every vehicle) or written for a specific make.
 * The renderer always shows a qualification alongside "generic" codes.
 */
export const faultCodeSchema = z.object({
  id: z.string(),
  code: faultCode,
  title: z.string().min(1).max(160),
  meaning: z.string().min(1).max(2000),
  scope: z.enum(["generic", "manufacturer-specific"]).default("generic"),
  /** The system the code belongs to, e.g. "Exhaust / emissions". */
  system: z.string().max(80).optional(),
  symptoms: z.array(z.string().min(1).max(200)).max(20).optional(),
  possibleCauses: z.array(z.string().min(1).max(200)).max(20).optional(),
  diagnosticSteps: z.array(z.string().min(1).max(300)).max(20).optional(),
  relatedVehicles: z.array(z.string().min(1).max(80)).max(20).optional(),
  relatedGuideSlugs: z.array(z.string()).max(12).optional(),
  relatedServiceIds: z.array(z.string()).max(12).optional(),
  relatedVideoIds: z.array(z.string()).max(12).optional(),
  /** Warnings / notes (e.g. when to stop driving). */
  notes: textList(300),
  categorySlugs,
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  status: z.enum(PUBLISH_STATUSES),
});
export type FaultCode = z.infer<typeof faultCodeSchema>;

/** videos/{id}. The video itself always stays on YouTube; this is metadata only. */
export const videoSchema = z.object({
  id: z.string(),
  slug: z.string().regex(slugPattern),
  title: z.string().min(1).max(160),
  youtubeUrl: httpsUrl,
  youtubeVideoId: z.string().regex(youtubeIdPattern),
  thumbnail: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  vehicleMake: z.string().max(60).optional(),
  vehicleModel: z.string().max(60).optional(),
  category: z.string().max(80).optional(),
  relatedGuideSlug: z.string().optional(),
  relatedFaultCodes: z.array(faultCode).max(12).optional(),
  relatedServiceIds: z.array(z.string()).max(12).optional(),
  categorySlugs,
  /** The date the video was published ON YOUTUBE, entered by the author. Never inferred. */
  uploadDate: isoDay.optional(),
  /** ISO 8601 duration from YouTube, e.g. PT8M12S. Optional; never inferred. */
  duration: z.string().regex(/^PT(?=\d)(\d+H)?(\d+M)?(\d+S)?$/).optional(),
  /** When the video page went live on this site (not the YouTube upload date). */
  publishedAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  order: z.number().int().optional(),
  status: z.enum(PUBLISH_STATUSES),
});
export type Video = z.infer<typeof videoSchema>;

/** Best-effort YouTube thumbnail when the record has none of its own. */
export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export interface StoredPhoto {
  path: string;
  contentType: string;
  size: number;
}

/**
 * Admin booking pipeline (Phase 3). `new` is the only status a public booking
 * can be created with; every later status is set by staff in `/admin`.
 */
export const BOOKING_STATUSES = [
  "new",
  "contacted",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  new: "New",
  contacted: "Contacted",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** An internal staff note attached to a booking. Never shown to the customer. */
export interface BookingNote {
  id: string;
  text: string;
  authorUid: string;
  authorEmail: string | null;
  at: string;
}

export interface BookingRecord {
  reference: string;
  businessId: string;
  status: BookingStatus;
  serviceId: string;
  serviceSnapshot: { name: string; slug: string; categoryName: string };
  customer: { name: string; phone: string; email: string };
  vehicle: { vrm: string; make: string; model: string; source: "manual" };
  symptoms: string;
  preferred: { date: string; timeWindow: TimeWindow };
  consent: { privacyAcceptedAt: string; privacyNoticeVersion: string };
  photos: StoredPhoto[];
  source: "web";
  ipHash: string;
  schemaVersion: 1;
  notes: BookingNote[];
  statusUpdatedAt: string | null;
}

/**
 * galleryImages/{id}. Files live in Storage under `gallery/{businessId}/{id}.{ext}`,
 * uploaded only by staff via the Admin SDK; `url` is the public download URL set at
 * upload time (see `src/lib/admin/gallery.ts`).
 */
export const galleryImageSchema = z.object({
  id: z.string(),
  path: z.string().min(1),
  url: httpsUrl,
  contentType: z.string().min(1),
  size: z.number().int().nonnegative(),
  caption: z.string().max(200).optional(),
  category: z.string().max(80).optional(),
  order: z.number().int(),
  status: z.enum(PUBLISH_STATUSES),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type GalleryImage = z.infer<typeof galleryImageSchema>;

/**
 * reviews/{id}. Entered by staff from a real review the workshop received
 * elsewhere (Google, Facebook, in person) — the site never invents reviews.
 */
export const REVIEW_SOURCES = ["google", "facebook", "direct", "other"] as const;
export const reviewSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  review: z.string().min(1).max(2000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.enum(REVIEW_SOURCES),
  status: z.enum(PUBLISH_STATUSES),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Review = z.infer<typeof reviewSchema>;

/** auditLogs/{id}. Written for every sensitive admin mutation; staff-only, read via `/admin`. */
export interface AuditLogEntry {
  id: string;
  at: string;
  actorUid: string;
  actorEmail: string | null;
  actorRole: Role;
  action: string;
  targetType: string;
  targetId: string;
  meta?: Record<string, string | number | boolean>;
}

export function formatPrice(s: Pick<Service, "priceMode" | "pricePence" | "vatIncluded">): string {
  if (s.priceMode === "quote" || s.pricePence === undefined) return "Quote on request";
  const pounds = (s.pricePence / 100).toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });
  const vat = s.vatIncluded === undefined ? "" : s.vatIncluded ? " inc. VAT" : " + VAT";
  return `${s.priceMode === "from" ? "From " : ""}${pounds}${vat}`;
}
