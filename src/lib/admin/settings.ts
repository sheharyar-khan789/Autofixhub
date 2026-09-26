import "server-only";
import { businessId } from "@/lib/env";
import { getDb } from "@/lib/firebase/admin";
import { logServerError } from "@/lib/logger";
import { businessSettingsSchema, type BusinessSettings } from "@/lib/models";
import type { StaffSession } from "@/lib/auth/session";
import { writeAuditLog } from "./audit";

/**
 * Settings are never hardcoded in the frontend — every public page reads them
 * via `getSettingsOrNull()` (`src/lib/data.ts`), which reads the same
 * `settings/{businessId}` document this writes. Every field stays optional:
 * an unfilled field renders as a placeholder/hidden on the public site rather
 * than a fabricated fact.
 */
export async function getSettingsAdmin(): Promise<BusinessSettings | null> {
  const snap = await getDb().collection("settings").doc(businessId()).get();
  if (!snap.exists) return null;
  const res = businessSettingsSchema.safeParse(snap.data());
  if (!res.success) {
    logServerError("admin.settings.parse", res.error);
    return null;
  }
  return res.data;
}

export async function updateSettingsAdmin(
  patch: BusinessSettings,
  actor: Pick<StaffSession, "uid" | "email" | "role">,
): Promise<BusinessSettings> {
  const validated = businessSettingsSchema.parse(patch);
  // Merge, not replace: the admin form only ever covers a subset of fields
  // (see the settings page for which), so a full replace would silently wipe
  // anything set another way. Firestore's `ignoreUndefinedProperties` (see
  // `getDb()`) means a field the form left blank is simply not touched.
  await getDb().collection("settings").doc(businessId()).set(validated, { merge: true });
  await writeAuditLog(actor, "settings.update", { type: "settings", id: businessId() });
  return validated;
}
