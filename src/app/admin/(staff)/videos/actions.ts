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
  AdminNotFoundError,
  adminErrorMessage,
  adminFailure,
  createAdmin,
  deleteAdminDoc,
  getAdminById,
  setStatusAdmin,
  updateAdmin,
  videoInputSchema,
  videosConfig,
} from "@/lib/admin/content";
import { writeAuditLog } from "@/lib/admin/audit";
import { extractYoutubeId, youtubeWatchUrl } from "@/lib/admin/youtube";
import { deleteVideoThumbnail, readThumbnailFile, uploadVideoThumbnail } from "@/lib/admin/videoThumbnails";
import {
  invalid,
  parseCheckboxes,
  parseCsvIds,
  saveNotice,
  schemaErrors,
  statusFromForm,
  withNotice,
  type FieldErrors,
  type FormState,
} from "@/lib/admin/forms";
import { PUBLISH_STATUSES, type PublishStatus, type Video } from "@/lib/models";
import type { DeleteActionState } from "../../_components/DeleteButton";

export type ActionState = FormState;

function parseForm(formData: FormData) {
  const pastedUrl = String(formData.get("youtubeUrl") ?? "").trim();
  const videoId = extractYoutubeId(pastedUrl);
  const extra: FieldErrors = {};
  if (!videoId) extra.youtubeUrl = "Couldn't find a valid YouTube video in that URL.";
  const raw = {
    slug: String(formData.get("slug") ?? "").toLowerCase(),
    title: String(formData.get("title") ?? ""),
    youtubeUrl: videoId ? youtubeWatchUrl(videoId) : "",
    youtubeVideoId: videoId ?? "",
    // A Shorts link implies the 9:16 frame when the form didn't send a type.
    videoType: String(formData.get("videoType") ?? "") || (/\/shorts\//i.test(pastedUrl) ? "short" : "standard"),
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
  const parsed = videoInputSchema.safeParse(raw);
  if (!parsed.success || Object.keys(extra).length) {
    // The stored YouTube fields are derived from the one "youtubeUrl" input.
    const field = (path: readonly PropertyKey[]) => (path[0] === "youtubeVideoId" ? "youtubeUrl" : typeof path[0] === "string" ? path[0] : undefined);
    return { ok: false as const, state: schemaErrors(parsed.success ? [] : parsed.error.issues, extra, field) };
  }
  return { ok: true as const, data: parsed.data };
}

/**
 * Thumbnail handling: a chosen file replaces the thumbnail, `thumbnailAction=remove` clears
 * it (back to the YouTube thumbnail), otherwise the stored one is kept. The thumbnail
 * fields are never taken from the form, so a request can't point a video at another file.
 * The new file is uploaded only once everything else is valid, removed again if the save
 * fails, and the replaced/removed upload is deleted only after the save succeeded.
 */
export async function saveVideoAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole(CONTENT_ROLES);
  const parsed = parseForm(formData);
  const chosen = formData.get("thumbnailFile");
  const file = chosen instanceof File && chosen.size > 0 ? await readThumbnailFile(chosen) : null;
  if (file && "error" in file) {
    return invalid({ ...(parsed.ok ? {} : parsed.state.fieldErrors), thumbnailFile: file.error });
  }
  if (!parsed.ok) return parsed.state;

  let existing: Video | null = null;
  let uploaded: { path: string; url: string } | null = null;
  const data: Record<string, unknown> & { thumbnail?: string; thumbnailPath?: string } = { ...parsed.data };
  try {
    if (id) {
      existing = await getAdminById(videosConfig, id);
      if (!existing) throw new AdminNotFoundError("Video not found.");
    }
    data.thumbnail = existing?.thumbnail;
    data.thumbnailPath = existing?.thumbnailPath;
    if (file) {
      uploaded = await uploadVideoThumbnail(file.bytes, file.type);
      data.thumbnail = uploaded.url;
      data.thumbnailPath = uploaded.path;
    } else if (formData.get("thumbnailAction") === "remove") {
      data.thumbnail = undefined;
      data.thumbnailPath = undefined;
    }
    if (id) {
      await updateAdmin(videosConfig, id, data);
      await writeAuditLog(session, "video.update", { type: "video", id });
    } else {
      const created = await createAdmin(videosConfig, data);
      await writeAuditLog(session, "video.create", { type: "video", id: created.id });
    }
  } catch (err) {
    if (uploaded) await deleteVideoThumbnail(uploaded.path);
    if (isNotConfigured(err)) return { error: "Firebase Admin is not configured here." };
    logServerError("admin.video.save", err, { id: id ?? undefined });
    return adminFailure(err, "Could not save the video. Try again.");
  }
  if (existing?.thumbnailPath && existing.thumbnailPath !== data.thumbnailPath) await deleteVideoThumbnail(existing.thumbnailPath);
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
    const existing = await getAdminById(videosConfig, id);
    await deleteAdminDoc(videosConfig, id);
    await deleteVideoThumbnail(existing?.thumbnailPath);
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
  // From an edit page, go back to the list: the deleted record's page no longer exists.
  const back = formData.get("redirectTo");
  if (back) redirect(withNotice(safeAdminNext(back), "deleted"));
  return { success: "Video deleted." };
}
