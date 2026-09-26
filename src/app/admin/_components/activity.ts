import type { ActivityItem } from "@/lib/admin/dashboard";
import type { AuditLogEntry } from "@/lib/models";

const ACTION_LABELS: Record<string, string> = {
  "guide.create": "created guide",
  "guide.update": "edited guide",
  "guide.status": "changed status of guide",
  "guide.delete": "deleted guide",
  "video.create": "added video",
  "video.update": "edited video",
  "video.status": "changed status of video",
  "video.delete": "deleted video",
  "faultCode.create": "created fault code",
  "faultCode.update": "edited fault code",
  "faultCode.status": "changed status of fault code",
  "faultCode.delete": "deleted fault code",
  "category.create": "created category",
  "category.update": "edited category",
  "category.status": "changed status of category",
  "category.delete": "deleted category",
  "gallery.upload": "uploaded media",
  "gallery.update": "edited media",
  "gallery.delete": "deleted media",
  "settings.update": "updated settings",
  "booking.status": "changed booking status",
  "booking.note": "added a booking note",
};

/** Human-readable audit line: "owner@x changed status of guide → published". */
export function auditLine(e: AuditLogEntry): string {
  const actor = e.actorEmail ?? e.actorUid;
  const status = typeof e.meta?.status === "string" ? ` → ${e.meta.status}` : "";
  return `${actor} ${ACTION_LABELS[e.action] ?? e.action}${status}`;
}

export function activityLine(item: ActivityItem): string {
  if (item.kind === "booking") return `Booking ${item.booking.reference} received (${item.booking.serviceSnapshot.name})`;
  return auditLine(item.entry);
}
