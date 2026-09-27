"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { isNotConfigured } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import {
  adminErrorMessage,
  adminFailure,
  createAdmin,
  deleteAdminDoc,
  findServiceDeleteBlocker,
  serviceInputSchema,
  servicesConfig,
  setStatusAdmin,
  updateAdmin,
} from "@/lib/admin/content";
import { writeAuditLog } from "@/lib/admin/audit";
import { isSafeImageRef, schemaErrors, type FieldErrors, type FormState } from "@/lib/admin/forms";
import { PUBLISH_STATUSES, type PublishStatus } from "@/lib/models";

export type ActionState = FormState;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Reads the shared fields of the service form out of a FormData and validates them. */
function parseForm(formData: FormData) {
  const raw = {
    categoryId: String(formData.get("categoryId") ?? ""),
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? "").toLowerCase(),
    summary: String(formData.get("summary") ?? ""),
    body: String(formData.get("body") ?? "") || undefined,
    image: String(formData.get("image") ?? "") || undefined,
    priceMode: String(formData.get("priceMode") ?? "quote"),
    pricePence: formData.get("pricePence") ? Math.round(Number(formData.get("pricePence")) * 100) : undefined,
    vatIncluded: formData.get("vatIncluded") === "on" ? true : formData.get("vatIncluded") === "off" ? false : undefined,
    estimatedMinutes: formData.get("estimatedMinutes") ? Number(formData.get("estimatedMinutes")) : undefined,
    bookable: formData.get("bookable") === "on",
    order: Number(formData.get("order") ?? 0),
    seoTitle: String(formData.get("seoTitle") ?? "") || undefined,
    seoDescription: String(formData.get("seoDescription") ?? "") || undefined,
    status: String(formData.get("status") ?? "draft"),
  };
  const extra: FieldErrors = {};
  if (!slugPattern.test(raw.slug)) extra.slug = "Slug must be lowercase letters, numbers and hyphens only.";
  if (raw.image !== undefined && !isSafeImageRef(raw.image)) {
    extra.image = "Image must be an https:// URL or a path on this site starting with /.";
  }
  const parsed = serviceInputSchema.safeParse(raw);
  if (!parsed.success || Object.keys(extra).length) {
    return { ok: false as const, state: schemaErrors(parsed.success ? [] : parsed.error.issues, extra) };
  }
  return { ok: true as const, data: parsed.data };
}

export async function saveServiceAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole(CONTENT_ROLES);
  const parsed = parseForm(formData);
  if (!parsed.ok) return parsed.state;

  let savedId = id;
  try {
    if (id) {
      await updateAdmin(servicesConfig, id, parsed.data);
      await writeAuditLog(session, "service.update", { type: "service", id });
    } else {
      const created = await createAdmin(servicesConfig, parsed.data);
      savedId = created.id;
      await writeAuditLog(session, "service.create", { type: "service", id: created.id });
    }
  } catch (err) {
    if (isNotConfigured(err)) return { error: "Firebase Admin is not configured here." };
    logServerError("admin.service.save", err, { id: id ?? undefined });
    return adminFailure(err, "Could not save the service. Try again.");
  }
  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/services/[slug]", "page");
  if (savedId) revalidatePath(`/admin/services/${savedId}`);
  redirect("/admin/services");
}

export async function setServiceStatusAction(formData: FormData): Promise<void> {
  const session = await requireRole(CONTENT_ROLES);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !(PUBLISH_STATUSES as readonly string[]).includes(status)) return;
  try {
    await setStatusAdmin(servicesConfig, id, status as PublishStatus);
  } catch (err) {
    logServerError("admin.service.status", err, { id });
    throw new Error(adminErrorMessage(err, "Could not change the status. Try again."));
  }
  await writeAuditLog(session, "service.status", { type: "service", id }, { status });
  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/services/[slug]", "page");
}

export async function deleteServiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole(CONTENT_ROLES);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing service id." };
  try {
    const blocker = await findServiceDeleteBlocker(id);
    if (blocker) return { error: blocker };
    await deleteAdminDoc(servicesConfig, id);
    await writeAuditLog(session, "service.delete", { type: "service", id });
  } catch (err) {
    if (isNotConfigured(err)) return { error: "Firebase Admin is not configured here." };
    logServerError("admin.service.delete", err, { id });
    return { error: adminErrorMessage(err, "Could not delete the service.") };
  }
  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/services/[slug]", "page");
  return { success: "Service deleted." };
}
