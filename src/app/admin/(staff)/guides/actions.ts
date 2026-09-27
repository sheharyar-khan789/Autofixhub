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
  adminFailure,
  createAdmin,
  deleteAdminDoc,
  guideInputSchema,
  guidesConfig,
  setStatusAdmin,
  updateAdmin,
} from "@/lib/admin/content";
import { writeAuditLog } from "@/lib/admin/audit";
import {
  isSafeImageRef,
  parseCheckboxes,
  parseCsvIds,
  parseFaqs,
  parseLines,
  saveNotice,
  schemaErrors,
  statusFromForm,
  withNotice,
  type FieldErrors,
  type FormState,
} from "@/lib/admin/forms";
import { extractYoutubeId } from "@/lib/admin/youtube";
import { PUBLISH_STATUSES, type PublishStatus } from "@/lib/models";
import type { DeleteActionState } from "../../_components/DeleteButton";

export type ActionState = FormState;

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim() || undefined;

function parseForm(formData: FormData) {
  const youtubeInput = text(formData, "youtubeUrl");
  const youtubeVideoId = youtubeInput ? extractYoutubeId(youtubeInput) : undefined;
  const extra: FieldErrors = {};
  if (youtubeInput && !youtubeVideoId) extra.youtubeUrl = "Couldn't find a valid YouTube video in that URL.";
  const faqs = parseFaqs(formData.get("faqs"));
  if (faqs.error) extra.faqs = faqs.error;

  const raw = {
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    title: String(formData.get("title") ?? "").trim(),
    excerpt: String(formData.get("excerpt") ?? "").trim(),
    content: String(formData.get("content") ?? "").trim(),
    featuredImage: text(formData, "featuredImage"),
    vehicleMake: text(formData, "vehicleMake"),
    vehicleModel: text(formData, "vehicleModel"),
    vehicleGeneration: text(formData, "vehicleGeneration"),
    vehicleYearFrom: formData.get("vehicleYearFrom") ? Number(formData.get("vehicleYearFrom")) : undefined,
    vehicleYearTo: formData.get("vehicleYearTo") ? Number(formData.get("vehicleYearTo")) : undefined,
    engine: text(formData, "engine"),
    fuelType: text(formData, "fuelType"),
    problemCategory: text(formData, "problemCategory"),
    symptoms: parseLines(formData.get("symptoms")),
    possibleCauses: parseLines(formData.get("possibleCauses")),
    recommendedChecks: parseLines(formData.get("recommendedChecks")),
    diagnosis: text(formData, "diagnosis"),
    repairInfo: text(formData, "repairInfo"),
    warnings: parseLines(formData.get("warnings")),
    relatedFaultCodes: parseCsvIds(formData.get("relatedFaultCodes"))?.map((c) => c.toUpperCase()),
    relatedGuideSlugs: parseCsvIds(formData.get("relatedGuideSlugs"))?.map((c) => c.toLowerCase()),
    relatedVideoIds: parseCsvIds(formData.get("relatedVideoIds")),
    categorySlugs: parseCheckboxes(formData.getAll("categorySlugs")),
    youtubeVideoId: youtubeVideoId ?? undefined,
    faqs: faqs.faqs,
    author: text(formData, "author"),
    seoTitle: text(formData, "seoTitle"),
    seoDescription: text(formData, "seoDescription"),
    canonicalUrl: text(formData, "canonicalUrl"),
    ogImage: text(formData, "ogImage"),
    noindex: formData.get("noindex") === "on" ? true : undefined,
    order: formData.get("order") ? Number(formData.get("order")) : undefined,
    status: statusFromForm(formData),
  };
  for (const [key, label] of [["featuredImage", "Featured image"], ["ogImage", "Social share image"]] as const) {
    const v = raw[key];
    if (v !== undefined && !isSafeImageRef(v)) {
      extra[key] = `${label} must be an https:// URL or a path on this site starting with /.`;
    }
  }
  if (raw.relatedGuideSlugs?.includes(raw.slug)) {
    extra.relatedGuideSlugs = "A guide can't list itself as a related guide.";
  }
  const parsed = guideInputSchema.safeParse(raw);
  if (!parsed.success || Object.keys(extra).length) {
    // youtubeVideoId is derived from the "youtubeUrl" input.
    const field = (path: readonly PropertyKey[]) => (path[0] === "youtubeVideoId" ? "youtubeUrl" : typeof path[0] === "string" ? path[0] : undefined);
    return { ok: false as const, state: schemaErrors(parsed.success ? [] : parsed.error.issues, extra, field) };
  }
  return { ok: true as const, data: parsed.data };
}

export async function saveGuideAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole(CONTENT_ROLES);
  const parsed = parseForm(formData);
  if (!parsed.ok) return parsed.state;

  let savedId = id;
  try {
    if (id) {
      await updateAdmin(guidesConfig, id, parsed.data);
      await writeAuditLog(session, "guide.update", { type: "guide", id });
    } else {
      const created = await createAdmin(guidesConfig, parsed.data);
      savedId = created.id;
      await writeAuditLog(session, "guide.create", { type: "guide", id: created.id });
    }
  } catch (err) {
    if (isNotConfigured(err)) return { error: "Firebase Admin is not configured here." };
    logServerError("admin.guide.save", err, { id: id ?? undefined });
    return adminFailure(err, "Could not save the guide. Try again.");
  }
  revalidatePath("/admin/guides");
  revalidatePath("/guides");
  revalidateContent();
  revalidatePath("/guides/[slug]", "page");
  if (savedId) revalidatePath(`/guides/${parsed.data.slug}`);
  redirect(withNotice("/admin/guides", saveNotice(!id, parsed.data.status)));
}

export async function setGuideStatusAction(formData: FormData): Promise<void> {
  const session = await requireRole(CONTENT_ROLES);
  const back = safeAdminNext(formData.get("back") ?? "/admin/guides");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !(PUBLISH_STATUSES as readonly string[]).includes(status)) return;
  try {
    await setStatusAdmin(guidesConfig, id, status as PublishStatus);
  } catch (err) {
    logServerError("admin.guide.status", err, { id });
    redirect(withNotice(back, "action-failed"));
  }
  await writeAuditLog(session, "guide.status", { type: "guide", id }, { status });
  revalidatePath("/admin/guides");
  revalidatePath("/guides");
  revalidateContent();
  revalidatePath("/guides/[slug]", "page");
  redirect(withNotice(back, status === "published" ? "published" : "unpublished"));
}

export async function deleteGuideAction(_prev: DeleteActionState, formData: FormData): Promise<DeleteActionState> {
  const session = await requireRole(CONTENT_ROLES);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing guide id." };
  try {
    await deleteAdminDoc(guidesConfig, id);
    await writeAuditLog(session, "guide.delete", { type: "guide", id });
  } catch (err) {
    if (isNotConfigured(err)) return { error: "Firebase Admin is not configured here." };
    logServerError("admin.guide.delete", err, { id });
    return { error: adminErrorMessage(err, "Could not delete the guide.") };
  }
  revalidatePath("/admin/guides");
  revalidatePath("/guides");
  revalidateContent();
  revalidatePath("/guides/[slug]", "page");
  // From an edit page, go back to the list: the deleted record's page no longer exists.
  const back = formData.get("redirectTo");
  if (back) redirect(withNotice(safeAdminNext(back), "deleted"));
  return { success: "Guide deleted." };
}
