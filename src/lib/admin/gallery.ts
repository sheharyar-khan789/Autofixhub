import "server-only";
import { randomUUID } from "node:crypto";
import { businessId } from "@/lib/env";
import { getBucket, getDb } from "@/lib/firebase/admin";
import { logServerError } from "@/lib/logger";
import { galleryImageSchema, type GalleryImage, type PublishStatus } from "@/lib/models";
import { PHOTO_EXTENSIONS, sniffImageType } from "@/lib/validation/photos";
import type { StaffSession } from "@/lib/auth/session";
import { writeAuditLog } from "./audit";
import { AdminNotFoundError, isDocId } from "./content";

const COLLECTION = "galleryImages";

export async function listGalleryAdmin(): Promise<GalleryImage[]> {
  const snap = await getDb().collection(COLLECTION).where("businessId", "==", businessId()).get();
  const out: GalleryImage[] = [];
  for (const d of snap.docs) {
    const res = galleryImageSchema.safeParse({ ...d.data(), id: d.id });
    if (res.success) out.push(res.data);
    else logServerError("admin.gallery.parse", res.error, { docId: d.id });
  }
  return out.sort((a, b) => a.order - b.order);
}

/** A user-correctable problem with the upload (safe to show to staff). */
export class GalleryInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GalleryInputError";
  }
}

export interface GalleryUploadInput {
  bytes: Uint8Array;
  caption?: string;
  category?: string;
  order: number;
  status: PublishStatus;
}

/**
 * Uploads through the Admin SDK only (Storage rules deny every client request,
 * see `storage.rules`) and makes the object publicly readable by its URL —
 * gallery photos are marketing content, not the private booking uploads.
 */
export async function uploadGalleryImageAdmin(
  input: GalleryUploadInput,
  actor: Pick<StaffSession, "uid" | "email" | "role">,
): Promise<GalleryImage> {
  const type = sniffImageType(input.bytes);
  if (!type) throw new GalleryInputError("File is not a recognised JPEG, PNG or WebP image.");
  const id = randomUUID();
  const ext = PHOTO_EXTENSIONS[type];
  const path = `gallery/${businessId()}/${id}.${ext}`;
  const bucket = getBucket();
  const url = `https://storage.googleapis.com/${bucket.name}/${path}`;
  const now = new Date().toISOString();
  const doc = {
    businessId: businessId(),
    path,
    url,
    contentType: type,
    size: input.bytes.byteLength,
    caption: input.caption,
    category: input.category,
    order: input.order,
    status: input.status,
    createdAt: now,
    updatedAt: now,
  };
  // Validate the record before anything is written, so bad input never leaves an orphaned file.
  const parsed = galleryImageSchema.safeParse({ ...doc, id });
  if (!parsed.success) throw new GalleryInputError(parsed.error.issues[0]?.message ?? "Check the form for errors.");
  const image = parsed.data;

  const file = bucket.file(path);
  await file.save(Buffer.from(input.bytes), {
    resumable: false,
    contentType: type,
    metadata: { cacheControl: "public, max-age=31536000, immutable" },
  });
  try {
    await file.makePublic();
    await getDb().collection(COLLECTION).doc(id).set(doc);
  } catch (err) {
    await file.delete({ ignoreNotFound: true }).catch((e) => logServerError("admin.gallery.cleanup", e, { path }));
    throw err;
  }
  await writeAuditLog(actor, "gallery.upload", { type: "galleryImage", id }, { path });
  return image;
}

export async function updateGalleryImageAdmin(
  id: string,
  patch: { caption?: string; category?: string; order?: number; status?: PublishStatus },
  actor: Pick<StaffSession, "uid" | "email" | "role">,
): Promise<GalleryImage> {
  if (!isDocId(id)) throw new AdminNotFoundError("Image not found.");
  const ref = getDb().collection(COLLECTION).doc(id);
  const snap = await ref.get();
  const data = snap.data();
  if (!snap.exists || !data || data.businessId !== businessId()) throw new AdminNotFoundError("Image not found.");
  const next = galleryImageSchema.safeParse({ ...data, ...stripUndefined(patch), id });
  if (!next.success) throw new GalleryInputError(next.error.issues[0]?.message ?? "Check the form for errors.");
  await ref.set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true });
  const after = await ref.get();
  const image = galleryImageSchema.parse({ ...after.data(), id: after.id });
  await writeAuditLog(actor, "gallery.update", { type: "galleryImage", id });
  return image;
}

export async function deleteGalleryImageAdmin(
  id: string,
  actor: Pick<StaffSession, "uid" | "email" | "role">,
): Promise<void> {
  if (!isDocId(id)) throw new AdminNotFoundError("Image not found.");
  const ref = getDb().collection(COLLECTION).doc(id);
  const snap = await ref.get();
  const data = snap.data();
  if (!snap.exists || !data || data.businessId !== businessId()) throw new AdminNotFoundError("Image not found.");
  await getBucket()
    .file(data.path as string)
    .delete({ ignoreNotFound: true });
  await ref.delete();
  await writeAuditLog(actor, "gallery.delete", { type: "galleryImage", id });
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
