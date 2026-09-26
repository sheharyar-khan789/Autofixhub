import "server-only";
import { businessId } from "@/lib/env";
import { getDb } from "@/lib/firebase/admin";
import { logServerError } from "@/lib/logger";
import { reviewSchema, type PublishStatus, type Review } from "@/lib/models";
import type { StaffSession } from "@/lib/auth/session";
import { writeAuditLog } from "./audit";
import { AdminNotFoundError, isDocId } from "./content";

const COLLECTION = "reviews";

export async function listReviewsAdmin(): Promise<Review[]> {
  const snap = await getDb().collection(COLLECTION).where("businessId", "==", businessId()).get();
  const out: Review[] = [];
  for (const d of snap.docs) {
    const res = reviewSchema.safeParse({ ...d.data(), id: d.id });
    if (res.success) out.push(res.data);
    else logServerError("admin.reviews.parse", res.error, { docId: d.id });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getReviewAdmin(id: string): Promise<Review | null> {
  if (!isDocId(id)) return null;
  const snap = await getDb().collection(COLLECTION).doc(id).get();
  const data = snap.data();
  if (!snap.exists || !data || data.businessId !== businessId()) return null;
  const res = reviewSchema.safeParse({ ...data, id: snap.id });
  if (!res.success) {
    logServerError("admin.reviews.parse", res.error, { docId: id });
    return null;
  }
  return res.data;
}

export type ReviewInput = Omit<Review, "id" | "createdAt" | "updatedAt">;

export async function createReviewAdmin(
  input: ReviewInput,
  actor: Pick<StaffSession, "uid" | "email" | "role">,
): Promise<Review> {
  const ref = getDb().collection(COLLECTION).doc();
  const now = new Date().toISOString();
  const doc = { ...input, businessId: businessId(), createdAt: now, updatedAt: now };
  await ref.set(doc);
  await writeAuditLog(actor, "review.create", { type: "review", id: ref.id });
  return reviewSchema.parse({ ...doc, id: ref.id });
}

export async function updateReviewAdmin(
  id: string,
  patch: Partial<ReviewInput>,
  actor: Pick<StaffSession, "uid" | "email" | "role">,
): Promise<Review> {
  if (!isDocId(id)) throw new AdminNotFoundError("Review not found.");
  const ref = getDb().collection(COLLECTION).doc(id);
  const snap = await ref.get();
  const data = snap.data();
  if (!snap.exists || !data || data.businessId !== businessId()) throw new AdminNotFoundError("Review not found.");
  await ref.set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true });
  const after = await ref.get();
  await writeAuditLog(actor, "review.update", { type: "review", id });
  return reviewSchema.parse({ ...after.data(), id: after.id });
}

export async function setReviewStatusAdmin(
  id: string,
  status: PublishStatus,
  actor: Pick<StaffSession, "uid" | "email" | "role">,
): Promise<void> {
  await updateReviewAdmin(id, { status }, actor);
}

export async function deleteReviewAdmin(
  id: string,
  actor: Pick<StaffSession, "uid" | "email" | "role">,
): Promise<void> {
  if (!isDocId(id)) throw new AdminNotFoundError("Review not found.");
  const ref = getDb().collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.businessId !== businessId()) throw new AdminNotFoundError("Review not found.");
  await ref.delete();
  await writeAuditLog(actor, "review.delete", { type: "review", id });
}
