import "server-only";
import { businessId, isNotConfigured } from "@/lib/env";
import { getDb } from "@/lib/firebase/admin";
import { logServerError } from "@/lib/logger";
import type { AuditLogEntry, PublishStatus } from "@/lib/models";
import { listRecentAuditLog } from "./audit";
import { countBookingsByStatus, listRecentBookings, type AdminBooking } from "./bookings";
import { categoriesConfig, faultCodesConfig, guidesConfig, videosConfig } from "./content";

async function count(collection: string, status?: PublishStatus): Promise<number> {
  let q = getDb().collection(collection).where("businessId", "==", businessId());
  if (status) q = q.where("status", "==", status);
  return (await q.count().get()).data().count;
}

export type StatKey =
  | "publishedGuides" | "draftGuides" | "publishedVideos" | "draftVideos"
  | "publishedFaultCodes" | "draftFaultCodes" | "publishedCategories" | "mediaAssets" | "newBookings";

/** A metric that failed to load is null (shown as "—"), never a made-up number. */
export type DashboardStats = Partial<Record<StatKey, number | null>>;

/**
 * Every number comes straight from a Firestore count() query. There is no analytics
 * integration, so no traffic or view figures exist here. Each metric loads
 * independently: one failing query can't blank the whole dashboard.
 */
export async function getDashboardStats(opts: { workshopFeatures: boolean }): Promise<{ stats: DashboardStats; notConfigured: boolean; failed: boolean }> {
  const jobs: [StatKey, () => Promise<number>][] = [
    ["publishedGuides", () => count(guidesConfig.collection, "published")],
    ["draftGuides", () => count(guidesConfig.collection, "draft")],
    ["publishedVideos", () => count(videosConfig.collection, "published")],
    ["draftVideos", () => count(videosConfig.collection, "draft")],
    ["publishedFaultCodes", () => count(faultCodesConfig.collection, "published")],
    ["draftFaultCodes", () => count(faultCodesConfig.collection, "draft")],
    ["publishedCategories", () => count(categoriesConfig.collection, "published")],
    ["mediaAssets", () => count("galleryImages")],
  ];
  if (opts.workshopFeatures) jobs.push(["newBookings", () => countBookingsByStatus("new")]);
  const results = await Promise.allSettled(jobs.map(([, run]) => run()));
  const stats: DashboardStats = {};
  let notConfigured = false;
  let failed = false;
  results.forEach((r, i) => {
    const key = jobs[i][0];
    if (r.status === "fulfilled") {
      stats[key] = r.value;
      return;
    }
    stats[key] = null;
    if (isNotConfigured(r.reason)) notConfigured = true;
    else {
      failed = true;
      logServerError("admin.dashboard.stat", r.reason, { stat: key });
    }
  });
  return { stats, notConfigured, failed };
}

export type ActivityItem =
  | { kind: "booking"; at: string; booking: AdminBooking }
  | { kind: "audit"; at: string; entry: AuditLogEntry };

export async function getRecentActivity(opts: { workshopFeatures: boolean }, limit = 8): Promise<ActivityItem[]> {
  const [bookings, audit] = await Promise.all([
    opts.workshopFeatures ? listRecentBookings(5) : Promise.resolve([]),
    listRecentAuditLog(10),
  ]);
  const items: ActivityItem[] = [
    ...bookings.map((b): ActivityItem => ({ kind: "booking", at: b.createdAt, booking: b })),
    ...audit.map((e): ActivityItem => ({ kind: "audit", at: e.at, entry: e })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
