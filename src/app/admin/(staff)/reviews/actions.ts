"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { isNotConfigured } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import { createReviewAdmin, deleteReviewAdmin, setReviewStatusAdmin, updateReviewAdmin, type ReviewInput } from "@/lib/admin/reviews";
import { adminErrorMessage, adminFailure } from "@/lib/admin/content";
import { schemaErrors, type FormState } from "@/lib/admin/forms";
import { reviewSchema, PUBLISH_STATUSES, type PublishStatus } from "@/lib/models";
import type { DeleteActionState } from "../../_components/DeleteButton";

export type ActionState = FormState;

const reviewInputSchema = reviewSchema.omit({ id: true, createdAt: true, updatedAt: true });

function parseForm(formData: FormData) {
  const raw = {
    name: String(formData.get("name") ?? ""),
    rating: Number(formData.get("rating") ?? 5),
    review: String(formData.get("review") ?? ""),
    date: String(formData.get("date") ?? ""),
    source: String(formData.get("source") ?? "direct"),
    status: String(formData.get("status") ?? "draft"),
  };
  const parsed = reviewInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, state: schemaErrors(parsed.error.issues) };
  return { ok: true as const, data: parsed.data as ReviewInput };
}

export async function saveReviewAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole(CONTENT_ROLES);
  const parsed = parseForm(formData);
  if (!parsed.ok) return parsed.state;
  try {
    if (id) await updateReviewAdmin(id, parsed.data, session);
    else await createReviewAdmin(parsed.data, session);
  } catch (err) {
    if (isNotConfigured(err)) return { error: "Firebase Admin is not configured here." };
    logServerError("admin.review.save", err, { id: id ?? undefined });
    return adminFailure(err, "Could not save the review. Try again.");
  }
  revalidatePath("/admin/reviews");
  revalidatePath("/");
  redirect("/admin/reviews");
}

export async function setReviewStatusFormAction(formData: FormData): Promise<void> {
  const session = await requireRole(CONTENT_ROLES);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !(PUBLISH_STATUSES as readonly string[]).includes(status)) return;
  try {
    await setReviewStatusAdmin(id, status as PublishStatus, session);
  } catch (err) {
    logServerError("admin.review.status", err, { id });
    throw new Error(adminErrorMessage(err, "Could not change the status. Try again."));
  }
  revalidatePath("/admin/reviews");
  revalidatePath("/");
}

export async function deleteReviewAction(_prev: DeleteActionState, formData: FormData): Promise<DeleteActionState> {
  const session = await requireRole(CONTENT_ROLES);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing review id." };
  try {
    await deleteReviewAdmin(id, session);
  } catch (err) {
    if (isNotConfigured(err)) return { error: "Firebase Admin is not configured here." };
    logServerError("admin.review.delete", err, { id });
    return { error: adminErrorMessage(err, "Could not delete the review.") };
  }
  revalidatePath("/admin/reviews");
  revalidatePath("/");
  return { success: "Review deleted." };
}
