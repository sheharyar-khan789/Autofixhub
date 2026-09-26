"use server";

import { revalidatePath } from "next/cache";
import { revalidateContent } from "@/lib/cache";
import { redirect } from "next/navigation";
import { safeAdminNext } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { isNotConfigured } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import {
  adminErrorMessage,
  createAdmin,
  deleteAdminDoc,
  setStatusAdmin,
  updateAdmin,
  videoInputSchema,
  videosConfig,
} from "@/lib/admin/content";
import { writeAuditLog } from "@/lib/admin/audit";
import { extractYoutubeId, youtubeWatchUrl } from "@/lib/admin/youtube";
import { isSafeImageRef, parseCheckboxes, parseCsvIds, saveNotice, statusFromForm, withNotice } from "@/lib/admin/forms";
import { PUBLISH_STATUSES, type PublishStatus } from "@/lib/models";
import type { DeleteActionState } from "../../_components/DeleteButton";

export interface ActionState {
  error?: string;
  success?: string;
}

function parseForm(formData: FormData) {
  const pastedUrl = String(formData.get("youtubeUrl") ?? "").trim();
  const videoId = extractYoutubeId(pastedUrl);
  if (!videoId) {
    return { ok: false as const, error: "Couldn't find a valid YouTube video in that URL." };
  }
  const raw = {
    slug: String(formData.get("slug") ?? "").toLowerCase(),
    title: String(formData.get("title") ?? ""),
    youtubeUrl: youtubeWatchUrl(videoId),
    youtubeVideoId: videoId,
    thumbnail: String(formData.get("thumbnail") ?? "") || undefined,
    description: String(formData.get("description") ?? "") || undefined,
    vehicleMake: String(formData.get("vehicleMake") ?? "") || undefined,
    vehicleModel: String(formData.get("vehicleModel") ?? "") || undefined,
    category: String(formData.get("category") ?? "") || undefined,
    relatedGuideSlug: String(formData.get("relatedGuideSlug") ?? "") || undefined,
    relatedFaultCodes: parseCsvIds(formData.get("relatedFaultCodes"))?.map((c) => c.toUpperCase()),
    categorySlugs: parseCheckboxes(formData.getAll("categorySlugs")),
    uploadDate: String(formData.get("uploadDate") ?? "").trim() || undefined,
    duration: String(formData.get("duration") ?? "").trim().toUpperCase() || undefined,
    order: formData.get("order") ? Number(formData.get("order")) : undefined,
    status: statusFromForm(formData),
  };
  if (raw.thumbnail !== undefined && !isSafeImageRef(raw.thumbnail)) {
    return { ok: false as const, error: "Thumbnail must be an https:// URL or a path on this site starting with /." };
  }
  const parsed = videoInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the form for errors." };
  return { ok: true as const, data: parsed.data };
}

export async function saveVideoAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole(CONTENT_ROLES);
  const parsed = parseForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  try {
    if (id) {
      await updateAdmin(videosConfig, id, parsed.data);
      await writeAuditLog(session, "video.update", { type: "video", id });
    } else {
      const created = await createAdmin(videosConfig, parsed.data);
      await writeAuditLog(session, "video.create", { type: "video", id: created.id });
    }
  } catch (err) {
    if (isNotConfigured(err)) return { error: "Firebase Admin is not configured here." };
    logServerError("admin.video.save", err, { id: id ?? undefined });
    return { error: adminErrorMessage(err, "Could not save the video. Try again.") };
  }
  revalidatePath("/admin/videos");
  revalidatePath("/videos");
  revalidateContent();
  revalidatePath("/videos/[slug]", "page");
  redirect(withNotice("/admin/videos", saveNotice(!id, parsed.data.status)));
}

export async function setVideoStatusAction(formData: FormData): Promise<void> {
  const session = await requireRole(CONTENT_ROLES);
  const back = safeAdminNext(formData.get("back") ?? "/admin/videos");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !(PUBLISH_STATUSES as readonly string[]).includes(status)) return;
  try {
    await setStatusAdmin(videosConfig, id, status as PublishStatus);
  } catch (err) {
    logServerError("admin.video.status", err, { id });
    redirect(withNotice(back, "action-failed"));
  }
  await writeAuditLog(session, "video.status", { type: "video", id }, { status });
  revalidatePath("/admin/videos");
  revalidatePath("/videos");
  revalidateContent();
  revalidatePath("/videos/[slug]", "page");
  redirect(withNotice(back, status === "published" ? "published" : "unpublished"));
}

export async function deleteVideoAction(_prev: DeleteActionState, formData: FormData): Promise<DeleteActionState> {
  const session = await requireRole(CONTENT_ROLES);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing video id." };
  try {
    await deleteAdminDoc(videosConfig, id);
    await writeAuditLog(session, "video.delete", { type: "video", id });
  } catch (err) {
    if (isNotConfigured(err)) return { error: "Firebase Admin is not configured here." };
    logServerError("admin.video.delete", err, { id });
    return { error: adminErrorMessage(err, "Could not delete the video.") };
  }
  revalidatePath("/admin/videos");
  revalidatePath("/videos");
  revalidateContent();
  revalidatePath("/videos/[slug]", "page");
  return { success: "Video deleted." };
}
