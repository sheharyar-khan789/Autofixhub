import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { businessId } from "@/lib/env";
import { getDb } from "@/lib/firebase/admin";
import { logServerError } from "@/lib/logger";
import type { AuditLogEntry, Role } from "@/lib/models";
import type { StaffSession } from "@/lib/auth/session";

/**
 * Writes one `auditLogs` document per sensitive admin action (status changes,
 * publish/unpublish, delete, settings edits, ...). Logging failures never
 * block the underlying action — an audit gap is preferable to a broken
 * dashboard — but they are reported to the server log so they're not silent.
 */
export async function writeAuditLog(
  actor: Pick<StaffSession, "uid" | "email" | "role">,
  action: string,
  target: { type: string; id: string },
  meta?: Record<string, string | number | boolean>,
): Promise<void> {
  try {
    await getDb()
      .collection("auditLogs")
      .add({
        businessId: businessId(),
        actorUid: actor.uid,
        actorEmail: actor.email ?? null,
        actorRole: actor.role,
        action,
        targetType: target.type,
        targetId: target.id,
        meta: meta ?? {},
        at: FieldValue.serverTimestamp(),
      });
  } catch (err) {
    logServerError("audit.write", err, { action, targetType: target.type, targetId: target.id });
  }
}

export async function listRecentAuditLog(limit = 10): Promise<AuditLogEntry[]> {
  return (await listAuditLogPage(limit)).entries;
}

/**
 * Cursor pagination over the audit log (newest first). Uses the composite index
 * auditLogs(businessId ASC, at DESC) declared in firestore.indexes.json. `before` is
 * the ISO time of the last entry on the previous page.
 */
export async function listAuditLogPage(limit = 25, before?: string): Promise<{ entries: AuditLogEntry[]; nextBefore: string | null }> {
  let q = getDb()
    .collection("auditLogs")
    .where("businessId", "==", businessId())
    .orderBy("at", "desc");
  const cursor = before ? new Date(before) : null;
  if (cursor && !Number.isNaN(cursor.getTime())) q = q.startAfter(Timestamp.fromDate(cursor));
  const snap = await q.limit(limit + 1).get();
  const entries = snap.docs.slice(0, limit).map(toEntry);
  return { entries, nextBefore: snap.docs.length > limit ? entries[entries.length - 1]?.at ?? null : null };
}

function toEntry(d: FirebaseFirestore.QueryDocumentSnapshot): AuditLogEntry {
  const data = d.data() as {
    actorUid: string;
    actorEmail: string | null;
    actorRole: Role;
    action: string;
    targetType: string;
    targetId: string;
    meta?: Record<string, string | number | boolean>;
    at?: Timestamp;
  };
  return {
    id: d.id,
    at: data.at ? data.at.toDate().toISOString() : new Date(0).toISOString(),
    actorUid: data.actorUid,
    actorEmail: data.actorEmail,
    actorRole: data.actorRole,
    action: data.action,
    targetType: data.targetType,
    targetId: data.targetId,
    meta: data.meta,
  };
}
