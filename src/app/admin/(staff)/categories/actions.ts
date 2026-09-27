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
  categoriesConfig,
  categoryInputSchema,
  createAdmin,
  deleteAdminDoc,
  setStatusAdmin,
  updateAdmin,
} from "@/lib/admin/content";
import { writeAuditLog } from "@/lib/admin/audit";
import { saveNotice, schemaErrors, statusFromForm, withNotice, type FormState } from "@/lib/admin/forms";
import { PUBLISH_STATUSES, type PublishStatus } from "@/lib/models";
import type { DeleteActionState } from "../../_components/DeleteButton";

export type ActionState = FormState;

function parseForm(formData: FormData) {
  const raw = {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    kind: String(formData.get("kind") ?? "topic"),
    description: String(formData.get("description") ?? "").trim() || undefined,
    order: formData.get("order") ? Number(formData.get("order")) : 0,
    seoTitle: String(formData.get("seoTitle") ?? "").trim() || undefined,
    seoDescription: String(formData.get("seoDescription") ?? "").trim() || undefined,
    status: statusFromForm(formData),
  };
  const parsed = categoryInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, state: schemaErrors(parsed.error.issues) };
  return { ok: true as const, data: parsed.data };
}

/** Category pages, the listing and every page that shows category links. */
function revalidateCategories() {
  revalidatePath("/admin/categories");
  revalidatePath("/categories");
  revalidatePath("/categories/[slug]", "page");
  revalidateContent();
}

export async function saveCategoryAction(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole(CONTENT_ROLES);
  const parsed = parseForm(formData);
  if (!parsed.ok) return parsed.state;
  try {
    if (id) {
      await updateAdmin(categoriesConfig, id, parsed.data);
      await writeAuditLog(session, "category.update", { type: "category", id });
    } else {
      const created = await createAdmin(categoriesConfig, parsed.data);
      await writeAuditLog(session, "category.create", { type: "category", id: created.id });
    }
  } catch (err) {
    if (isNotConfigured(err)) return { error: "Firebase Admin is not configured here." };
    logServerError("admin.category.save", err, { id: id ?? undefined });
    return adminFailure(err, "Could not save the category. Try again.");
  }
  revalidateCategories();
  redirect(withNotice("/admin/categories", saveNotice(!id, parsed.data.status)));
}

export async function setCategoryStatusAction(formData: FormData): Promise<void> {
  const session = await requireRole(CONTENT_ROLES);
  const back = safeAdminNext(formData.get("back") ?? "/admin/categories");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !(PUBLISH_STATUSES as readonly string[]).includes(status)) return;
  try {
    await setStatusAdmin(categoriesConfig, id, status as PublishStatus);
  } catch (err) {
    logServerError("admin.category.status", err, { id });
    redirect(withNotice(back, "action-failed"));
  }
  await writeAuditLog(session, "category.status", { type: "category", id }, { status });
  revalidateCategories();
  redirect(withNotice(back, status === "published" ? "published" : "unpublished"));
}

export async function deleteCategoryAction(_prev: DeleteActionState, formData: FormData): Promise<DeleteActionState> {
  const session = await requireRole(CONTENT_ROLES);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing category id." };
  try {
    await deleteAdminDoc(categoriesConfig, id);
    await writeAuditLog(session, "category.delete", { type: "category", id });
  } catch (err) {
    if (isNotConfigured(err)) return { error: "Firebase Admin is not configured here." };
    logServerError("admin.category.delete", err, { id });
    return { error: adminErrorMessage(err, "Could not delete the category.") };
  }
  revalidateCategories();
  // From an edit page, go back to the list: the deleted record's page no longer exists.
  const back = formData.get("redirectTo");
  if (back) redirect(withNotice(safeAdminNext(back), "deleted"));
  return { success: "Category deleted." };
}
