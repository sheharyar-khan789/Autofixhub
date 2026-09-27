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
  faultCodeInputSchema,
  faultCodesConfig,
  setStatusAdmin,
  updateAdmin,
} from "@/lib/admin/content";
import { writeAuditLog } from "@/lib/admin/audit";
import { parseCheckboxes, parseCsvIds, parseLines, saveNotice, schemaErrors, statusFromForm, withNotice, type FormState } from "@/lib/admin/forms";
import { PUBLISH_STATUSES, type PublishStatus } from "@/lib/models";
import type { DeleteActionState } from "../../_components/DeleteButton";

export type ActionState = FormState;

function parseForm(formData: FormData) {
  const raw = {
    code: String(formData.get("code") ?? "").replace(/\s+/g, "").toUpperCase(),
    title: String(formData.get("title") ?? "").trim(),
    meaning: String(formData.get("meaning") ?? "").trim(),
    scope: String(formData.get("scope") ?? "generic"),
    symptoms: parseLines(formData.get("symptoms")),
    possibleCauses: parseLines(formData.get("possibleCauses")),
    diagnosticSteps: parseLines(formData.get("diagnosticSteps")),
    relatedVehicles: parseLines(formData.get("relatedVehicles")),
    relatedGuideSlugs: parseCsvIds(formData.get("relatedGuideSlugs")),
    system: String(formData.get("system") ?? "").trim() || undefined,
    notes: parseLines(formData.get("notes")),
    categorySlugs: parseCheckboxes(formData.getAll("categorySlugs")),
    seoTitle: String(formData.get("seoTitle") ?? "").trim() || undefined,
    seoDescription: String(formData.get("seoDescription") ?? "").trim() || undefined,
    relatedVideoIds: parseCsvIds(formData.get("relatedVideoIds")),
    status: statusFromForm(formData),
  };
  const parsed = faultCodeInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, state: schemaErrors(parsed.error.issues) };
  return { ok: true as const, data: parsed.data };
}

export async function saveFaultCodeAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole(CONTENT_ROLES);
  const parsed = parseForm(formData);
  if (!parsed.ok) return parsed.state;

  try {
    if (id) {
      await updateAdmin(faultCodesConfig, id, parsed.data);
      await writeAuditLog(session, "faultCode.update", { type: "faultCode", id });
    } else {
      const created = await createAdmin(faultCodesConfig, parsed.data);
      await writeAuditLog(session, "faultCode.create", { type: "faultCode", id: created.id });
    }
  } catch (err) {
    if (isNotConfigured(err)) return { error: "Firebase Admin is not configured here." };
    logServerError("admin.faultCode.save", err, { id: id ?? undefined });
    return adminFailure(err, "Could not save the fault code. Try again.");
  }
  revalidatePath("/admin/fault-codes");
  revalidatePath("/fault-codes");
  revalidateContent();
  revalidatePath("/fault-codes/[code]", "page");
  redirect(withNotice("/admin/fault-codes", saveNotice(!id, parsed.data.status)));
}

export async function setFaultCodeStatusAction(formData: FormData): Promise<void> {
  const session = await requireRole(CONTENT_ROLES);
  const back = safeAdminNext(formData.get("back") ?? "/admin/fault-codes");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !(PUBLISH_STATUSES as readonly string[]).includes(status)) return;
  try {
    await setStatusAdmin(faultCodesConfig, id, status as PublishStatus);
  } catch (err) {
    logServerError("admin.faultCode.status", err, { id });
    redirect(withNotice(back, "action-failed"));
  }
  await writeAuditLog(session, "faultCode.status", { type: "faultCode", id }, { status });
  revalidatePath("/admin/fault-codes");
  revalidatePath("/fault-codes");
  revalidateContent();
  revalidatePath("/fault-codes/[code]", "page");
  redirect(withNotice(back, status === "published" ? "published" : "unpublished"));
}

export async function deleteFaultCodeAction(_prev: DeleteActionState, formData: FormData): Promise<DeleteActionState> {
  const session = await requireRole(CONTENT_ROLES);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing fault code id." };
  try {
    await deleteAdminDoc(faultCodesConfig, id);
    await writeAuditLog(session, "faultCode.delete", { type: "faultCode", id });
  } catch (err) {
    if (isNotConfigured(err)) return { error: "Firebase Admin is not configured here." };
    logServerError("admin.faultCode.delete", err, { id });
    return { error: adminErrorMessage(err, "Could not delete the fault code.") };
  }
  revalidatePath("/admin/fault-codes");
  revalidatePath("/fault-codes");
  revalidateContent();
  revalidatePath("/fault-codes/[code]", "page");
  // From an edit page, go back to the list: the deleted record's page no longer exists.
  const back = formData.get("redirectTo");
  if (back) redirect(withNotice(safeAdminNext(back), "deleted"));
  return { success: "Fault code deleted." };
}
