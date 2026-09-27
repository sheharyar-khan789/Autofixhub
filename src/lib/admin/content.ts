import "server-only";
import type { z } from "zod";
import { businessId } from "@/lib/env";
import { getDb } from "@/lib/firebase/admin";
import { logServerError } from "@/lib/logger";
import { invalid, type FormState } from "@/lib/admin/forms";
import {
  contentCategorySchema,
  faultCodeSchema,
  guideSchema,
  serviceCategorySchema,
  serviceSchema,
  videoSchema,
  type ContentCategory,
  type FaultCode,
  type Guide,
  type PublishStatus,
  type Service,
  type ServiceCategory,
  type Video,
} from "@/lib/models";

interface Entity {
  id: string;
  status: PublishStatus;
}

interface ContentConfig<T extends Entity> {
  collection: string;
  schema: z.ZodType<T>;
  scope: string;
  /** Whether this collection stamps `publishedAt` the first time it's published. */
  stampsPublishedAt: boolean;
}

export const servicesConfig: ContentConfig<Service> = {
  collection: "services",
  schema: serviceSchema,
  scope: "admin.services",
  stampsPublishedAt: false,
};
export const guidesConfig: ContentConfig<Guide> = {
  collection: "guides",
  schema: guideSchema,
  scope: "admin.guides",
  stampsPublishedAt: true,
};
export const faultCodesConfig: ContentConfig<FaultCode> = {
  collection: "faultCodes",
  schema: faultCodeSchema,
  scope: "admin.faultCodes",
  stampsPublishedAt: false,
};
export const videosConfig: ContentConfig<Video> = {
  collection: "videos",
  schema: videoSchema,
  scope: "admin.videos",
  stampsPublishedAt: true,
};

export const categoriesConfig: ContentConfig<ContentCategory> = {
  collection: "categories",
  schema: contentCategorySchema,
  scope: "admin.categories",
  stampsPublishedAt: false,
};

/**
 * Firestore document ids from a URL or form field. Rejects anything that isn't a
 * plain id (a "/" would address a different path) so a crafted value can never
 * reach another collection or throw inside the SDK.
 */
export function isDocId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(id);
}

/** Thrown when a record doesn't exist or belongs to a different business. */
export class AdminNotFoundError extends Error {
  constructor(message = "Record not found.") {
    super(message);
    this.name = "AdminNotFoundError";
  }
}

/** Thrown when a slug/code is already used by another record in the same collection. */
export class AdminConflictError extends Error {
  constructor(
    message: string,
    /** The form input the conflict belongs to (e.g. "slug"). */
    readonly field?: string,
  ) {
    super(message);
    this.name = "AdminConflictError";
  }
}

/** User-safe message for an admin mutation failure (never raw Firestore errors). */
export function adminErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && (err.name === "AdminNotFoundError" || err.name === "AdminConflictError")) {
    return err.message;
  }
  return fallback;
}

/** Form state for a failed admin save: a conflict is shown on its input, anything else in the summary. */
export function adminFailure(err: unknown, fallback: string): FormState {
  if (err instanceof Error && err.name === "AdminConflictError" && (err as AdminConflictError).field) {
    return invalid({ [(err as AdminConflictError).field!]: err.message });
  }
  return { error: adminErrorMessage(err, fallback) };
}

/** The field that must be unique per business for each collection (the public URL key). */
const UNIQUE_FIELD: Record<string, string> = {
  categories: "slug",
  services: "slug",
  guides: "slug",
  videos: "slug",
  faultCodes: "code",
};

async function assertUnique(collection: string, input: Record<string, unknown>, selfId: string | null) {
  const field = UNIQUE_FIELD[collection];
  const value = field ? input[field] : undefined;
  if (!field || typeof value !== "string") return;
  const snap = await getDb()
    .collection(collection)
    .where("businessId", "==", businessId())
    .where(field, "==", value)
    .limit(2)
    .get();
  if (snap.docs.some((d) => d.id !== selfId)) {
    throw new AdminConflictError(`Another record already uses the ${field} "${value}". Choose a different ${field}.`, field);
  }
}

/** Fields owned by the system, never by an admin form; kept when a form replaces a document. */
const PRESERVED_FIELDS = ["businessId", "createdAt", "publishedAt", "schemaVersion"] as const;

/** Loads a record and checks it belongs to this business; throws AdminNotFoundError otherwise. */
async function ownedRef(collection: string, id: string) {
  if (!isDocId(id)) throw new AdminNotFoundError();
  const ref = getDb().collection(collection).doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.businessId !== businessId()) throw new AdminNotFoundError();
  return ref;
}

/** All records regardless of status — the public repo layer only ever returns published ones. */
export async function listAllAdmin<T extends Entity>(cfg: ContentConfig<T>): Promise<T[]> {
  const snap = await getDb().collection(cfg.collection).where("businessId", "==", businessId()).get();
  const out: T[] = [];
  for (const d of snap.docs) {
    const res = cfg.schema.safeParse({ ...d.data(), id: d.id });
    if (res.success) out.push(res.data);
    else logServerError(`${cfg.scope}.parse`, res.error, { docId: d.id });
  }
  return out;
}

export async function getAdminById<T extends Entity>(cfg: ContentConfig<T>, id: string): Promise<T | null> {
  if (!isDocId(id)) return null;
  const snap = await getDb().collection(cfg.collection).doc(id).get();
  const data = snap.data();
  if (!snap.exists || !data || data.businessId !== businessId()) return null;
  const res = cfg.schema.safeParse({ ...data, id: snap.id });
  if (!res.success) {
    logServerError(`${cfg.scope}.parse`, res.error, { docId: id });
    return null;
  }
  return res.data;
}

export async function createAdmin<T extends Entity>(
  cfg: ContentConfig<T>,
  input: Record<string, unknown>,
): Promise<T> {
  await assertUnique(cfg.collection, input, null);
  const ref = getDb().collection(cfg.collection).doc();
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = { ...input, businessId: businessId(), createdAt: now, updatedAt: now };
  if (cfg.stampsPublishedAt && input.status === "published") payload.publishedAt = now;
  await ref.set(payload);
  return cfg.schema.parse({ ...payload, id: ref.id });
}

export async function updateAdmin<T extends Entity>(
  cfg: ContentConfig<T>,
  id: string,
  patch: Record<string, unknown>,
): Promise<T> {
  const ref = await ownedRef(cfg.collection, id);
  await assertUnique(cfg.collection, patch, id);
  const now = new Date().toISOString();
  const current = (await ref.get()).data() ?? {};
  // The admin form is the whole editable record, so REPLACE the document rather than merge:
  // with merge (and ignoreUndefinedProperties) a field cleared in the form would silently
  // keep its old value. System fields the form never carries are preserved explicitly.
  const update: Record<string, unknown> = { ...patch, updatedAt: now };
  for (const key of PRESERVED_FIELDS) if (current[key] !== undefined) update[key] = current[key];
  if (cfg.stampsPublishedAt && patch.status === "published" && !current.publishedAt) update.publishedAt = now;
  await ref.set(update);
  const snap = await ref.get();
  return cfg.schema.parse({ ...snap.data(), id: snap.id });
}

export async function setStatusAdmin<T extends Entity>(
  cfg: ContentConfig<T>,
  id: string,
  status: PublishStatus,
): Promise<void> {
  const ref = await ownedRef(cfg.collection, id);
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status, updatedAt: now };
  if (cfg.stampsPublishedAt && status === "published") {
    const current = (await ref.get()).data();
    if (!current?.publishedAt) patch.publishedAt = now;
  }
  await ref.set(patch, { merge: true });
}

export async function deleteAdminDoc(cfg: { collection: string }, id: string): Promise<void> {
  const ref = await ownedRef(cfg.collection, id);
  await ref.delete();
}

/**
 * A service is only safe to hard-delete when nothing depends on it: no
 * booking references it, and no published guide/fault code/video links back
 * to it. Deleting guides/fault codes/videos is always safe by design — every
 * relation to them is a soft reference elsewhere that simply stops resolving.
 */
export async function findServiceDeleteBlocker(id: string): Promise<string | null> {
  const db = getDb();
  const bId = businessId();

  const booking = await db
    .collection("bookings")
    .where("businessId", "==", bId)
    .where("serviceId", "==", id)
    .limit(1)
    .get();
  if (!booking.empty) return "This service has bookings attached to it. Unpublish it instead of deleting.";

  const [guides, faultCodes, videos] = await Promise.all([
    db.collection("guides").where("businessId", "==", bId).where("relatedServiceIds", "array-contains", id).limit(1).get(),
    db.collection("faultCodes").where("businessId", "==", bId).where("relatedServiceIds", "array-contains", id).limit(1).get(),
    db.collection("videos").where("businessId", "==", bId).where("relatedServiceIds", "array-contains", id).limit(1).get(),
  ]);
  if (!guides.empty || !faultCodes.empty || !videos.empty) {
    return "Other published content links to this service. Remove those links first, or unpublish instead of deleting.";
  }
  return null;
}

export async function listCategoriesAdmin(): Promise<ServiceCategory[]> {
  const snap = await getDb()
    .collection("serviceCategories")
    .where("businessId", "==", businessId())
    .get();
  const out: ServiceCategory[] = [];
  for (const d of snap.docs) {
    const res = serviceCategorySchema.safeParse({ ...d.data(), id: d.id });
    if (res.success) out.push(res.data);
    else logServerError("admin.categories.parse", res.error, { docId: d.id });
  }
  return out.sort((a, b) => a.order - b.order);
}

export const serviceInputSchema = serviceSchema.omit({ id: true });
export const guideInputSchema = guideSchema.omit({ id: true });
export const faultCodeInputSchema = faultCodeSchema.omit({ id: true });
export const videoInputSchema = videoSchema.omit({ id: true });
export const categoryInputSchema = contentCategorySchema.omit({ id: true, createdAt: true, updatedAt: true });

/** Categories for the admin pickers. A load failure degrades to "no categories" (logged), never a broken form. */
export async function loadCategoryOptions(): Promise<ContentCategory[]> {
  try {
    return (await listAllAdmin(categoriesConfig)).sort((a, b) => a.order - b.order);
  } catch (err) {
    logServerError("admin.categories.options", err);
    return [];
  }
}
