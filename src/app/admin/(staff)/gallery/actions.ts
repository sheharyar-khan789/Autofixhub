"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { isNotConfigured } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import { deleteGalleryImageAdmin, updateGalleryImageAdmin, uploadGalleryImageAdmin } from "@/lib/admin/gallery";
import { adminErrorMessage } from "@/lib/admin/content";
import { invalid, type FormState } from "@/lib/admin/forms";
import { MAX_GALLERY_PHOTO_BYTES } from "@/lib/validation/photos";
import { PUBLISH_STATUSES, type PublishStatus } from "@/lib/models";
import type { DeleteActionState } from "../../_components/DeleteButton";

export type ActionState = FormState;

function publishStatus(v: FormDataEntryValue | null): PublishStatus | undefined {
  const s = String(v ?? "");
  return (PUBLISH_STATUSES as readonly string[]).includes(s) ? (s as PublishStatus) : undefined;
}

/** Integer order from the form, or undefined when blank/not a whole number. */
function orderValue(v: FormDataEntryValue | null): number | undefined {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isInteger(n) ? n : undefined;
}

/** Staff-safe message: our own validation errors are shown, anything else is generic. */
function galleryErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.name === "GalleryInputError") return err.message;
  return adminErrorMessage(err, fallback);
}

function revalidateGallery() {
  revalidatePath("/admin/gallery");
  revalidatePath("/");
}

export async function uploadGalleryImageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole(CONTENT_ROLES);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return invalid({ file: "Choose an image to upload." });
  if (file.size > MAX_GALLERY_PHOTO_BYTES) {
    return invalid({ file: `That image is too large (max ${Math.round(MAX_GALLERY_PHOTO_BYTES / 1_000_000)}MB).` });
  }
  const rawOrder = String(formData.get("order") ?? "").trim();
  const order = rawOrder ? orderValue(rawOrder) : 0;
  if (order === undefined) return invalid({ order: "Order must be a whole number." });
  const status = publishStatus(formData.get("status") ?? "draft");
  if (!status) return invalid({ status: "Choose a valid status." });

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    await uploadGalleryImageAdmin(
      {
        bytes,
        caption: String(formData.get("caption") ?? "").trim() || undefined,
        category: String(formData.get("category") ?? "").trim() || undefined,
        order,
        status,
      },
      session,
    );
  } catch (err) {
    if (isNotConfigured(err)) return { error: "Firebase Admin is not configured here." };
    logServerError("admin.gallery.upload-action", err);
    return { error: galleryErrorMessage(err, "Could not upload the image. Try again.") };
  }
  revalidateGallery();
  return { success: "Image uploaded." };
}

export async function updateGalleryImageAction(formData: FormData): Promise<void> {
  const session = await requireRole(CONTENT_ROLES);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  try {
    await updateGalleryImageAdmin(
      id,
      {
        caption: String(formData.get("caption") ?? "").trim() || undefined,
        category: String(formData.get("category") ?? "").trim() || undefined,
        order: orderValue(formData.get("order")),
        status: publishStatus(formData.get("status")),
      },
      session,
    );
  } catch (err) {
    logServerError("admin.gallery.update-action", err, { id });
    throw new Error(galleryErrorMessage(err, "Could not save the image details. Try again."));
  }
  revalidateGallery();
}

export async function deleteGalleryImageAction(_prev: DeleteActionState, formData: FormData): Promise<DeleteActionState> {
  const session = await requireRole(CONTENT_ROLES);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing image id." };
  try {
    await deleteGalleryImageAdmin(id, session);
  } catch (err) {
    if (isNotConfigured(err)) return { error: "Firebase Admin is not configured here." };
    logServerError("admin.gallery.delete-action", err, { id });
    return { error: adminErrorMessage(err, "Could not delete the image.") };
  }
  revalidateGallery();
  return { success: "Image deleted." };
}
