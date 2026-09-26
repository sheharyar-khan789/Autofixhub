import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { withConfirmedBusiness } from "@/lib/business";
import { CONTENT_REVALIDATE_SECONDS, CONTENT_TAG } from "@/lib/cache";
import { isNotConfigured } from "@/lib/env";
import { logServerError, logServerWarn } from "@/lib/logger";
import type { BusinessSettings, ContentCategory, FaultCode, Guide, Service, ServiceCategory, Video } from "@/lib/models";
import { getStore } from "@/lib/repo";

/**
 * Published content and settings are cached ACROSS requests (tag CONTENT_TAG, cleared by
 * every admin mutation), then de-duplicated WITHIN a request by React `cache()` below.
 * Only successful reads are cached; errors are thrown, so they are never cached.
 */
/**
 * The data cache persists on disk (.next/cache) across server restarts, so entries are
 * scoped to the data source, Firebase project and business: switching any of them
 * (e.g. emulator vs fixtures vs production) can never serve another environment's data.
 */
const CACHE_SCOPE = [
  process.env.DATA_SOURCE?.trim() || "firestore",
  process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() || "-",
  process.env.BUSINESS_ID?.trim() || "default",
];
const shared = <A extends unknown[], R>(key: string, fn: (...args: A) => Promise<R>) =>
  unstable_cache(fn, ["autofixhub", ...CACHE_SCOPE, key], { revalidate: CONTENT_REVALIDATE_SECONDS, tags: [CONTENT_TAG] });

const store = {
  getSettings: shared("settings", () => getStore().getSettings()),
  listGuides: shared("guides", () => getStore().listGuides()),
  getGuideBySlug: shared("guide", (slug: string) => getStore().getGuideBySlug(slug)),
  listFaultCodes: shared("faultCodes", () => getStore().listFaultCodes()),
  getFaultCodeByCode: shared("faultCode", (code: string) => getStore().getFaultCodeByCode(code)),
  listVideos: shared("videos", () => getStore().listVideos()),
  getVideoBySlug: shared("video", (slug: string) => getStore().getVideoBySlug(slug)),
  listContentCategories: shared("categories", () => getStore().listContentCategories()),
};

export type Loaded<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "not-configured" | "error"; value: null };

function fail(scope: string, err: unknown): { ok: false; reason: "not-configured" | "error"; value: null } {
  if (isNotConfigured(err)) {
    logServerWarn(scope, (err as Error).message);
    return { ok: false, reason: "not-configured", value: null };
  }
  logServerError(scope, err);
  return { ok: false, reason: "error", value: null };
}

/**
 * Business settings, with owner-confirmed facts (`src/lib/business.ts`) filling any
 * field the settings document leaves empty. `value` is null only when loading failed.
 */
export const getSettings = cache(async (): Promise<Loaded<BusinessSettings | null>> => {
  try {
    return { ok: true, value: withConfirmedBusiness(await store.getSettings()) };
  } catch (err) {
    return fail("data.settings", err);
  }
});

export interface Catalog {
  categories: ServiceCategory[];
  services: Service[];
}

export const getCatalog = cache(async (): Promise<Loaded<Catalog>> => {
  try {
    const store = getStore();
    const [categories, services] = await Promise.all([store.listCategories(), store.listServices()]);
    return { ok: true, value: { categories, services } };
  } catch (err) {
    return fail("data.catalog", err);
  }
});

export const getGuides = cache(async (): Promise<Loaded<Guide[]>> => {
  try {
    return { ok: true, value: await store.listGuides() };
  } catch (err) {
    return fail("data.guides", err);
  }
});

export const getGuide = cache(async (slug: string): Promise<Loaded<Guide | null>> => {
  try {
    return { ok: true, value: await store.getGuideBySlug(slug) };
  } catch (err) {
    return fail("data.guide", err);
  }
});

export const getFaultCodes = cache(async (): Promise<Loaded<FaultCode[]>> => {
  try {
    return { ok: true, value: await store.listFaultCodes() };
  } catch (err) {
    return fail("data.faultCodes", err);
  }
});

export const getFaultCode = cache(async (code: string): Promise<Loaded<FaultCode | null>> => {
  try {
    return { ok: true, value: await store.getFaultCodeByCode(code) };
  } catch (err) {
    return fail("data.faultCode", err);
  }
});

export const getVideos = cache(async (): Promise<Loaded<Video[]>> => {
  try {
    return { ok: true, value: await store.listVideos() };
  } catch (err) {
    return fail("data.videos", err);
  }
});

export const getVideo = cache(async (slug: string): Promise<Loaded<Video | null>> => {
  try {
    return { ok: true, value: await store.getVideoBySlug(slug) };
  } catch (err) {
    return fail("data.video", err);
  }
});

export const getContentCategories = cache(async (): Promise<Loaded<ContentCategory[]>> => {
  try {
    return { ok: true, value: await store.listContentCategories() };
  } catch (err) {
    return fail("data.contentCategories", err);
  }
});

/** Convenience for layouts/sections that can render without settings. */
export async function getSettingsOrNull(): Promise<BusinessSettings> {
  const r = await getSettings();
  // Even if Firestore is unreachable, the confirmed brand/contact facts still render.
  return r.ok && r.value ? r.value : withConfirmedBusiness(null);
}

export interface KnowledgeContent {
  guides: Guide[];
  faultCodes: FaultCode[];
  videos: Video[];
  categories: ContentCategory[];
}

/**
 * All published knowledge content in one call (each list is request-cached and bounded,
 * see MAX_PUBLIC_ITEMS). A failed list degrades to empty so one outage doesn't blank the
 * whole page; `failed` lets callers show an honest notice.
 */
export const getKnowledgeContent = cache(async (): Promise<KnowledgeContent & { failed: boolean }> => {
  const [guides, faultCodes, videos, categories] = await Promise.all([
    getGuides(),
    getFaultCodes(),
    getVideos(),
    getContentCategories(),
  ]);
  return {
    guides: guides.ok ? guides.value : [],
    faultCodes: faultCodes.ok ? faultCodes.value : [],
    videos: videos.ok ? videos.value : [],
    categories: categories.ok ? categories.value : [],
    failed: !guides.ok || !faultCodes.ok || !videos.ok || !categories.ok,
  };
});
