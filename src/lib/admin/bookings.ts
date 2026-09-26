import "server-only";
import { randomUUID } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { businessId } from "@/lib/env";
import { getBucket, getDb } from "@/lib/firebase/admin";
import { logServerError } from "@/lib/logger";
import { BOOKING_STATUSES, type BookingNote, type BookingRecord, type BookingStatus } from "@/lib/models";
import type { StaffSession } from "@/lib/auth/session";
import { writeAuditLog } from "./audit";
import { AdminNotFoundError, isDocId } from "./content";

export interface AdminBooking extends BookingRecord {
  id: string;
  createdAt: string;
}

function fromDoc(id: string, data: FirebaseFirestore.DocumentData): AdminBooking {
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date(0).toISOString();
  const status: BookingStatus = BOOKING_STATUSES.includes(data.status) ? data.status : "new";
  return {
    id,
    reference: data.reference,
    businessId: data.businessId,
    status,
    serviceId: data.serviceId,
    serviceSnapshot: data.serviceSnapshot,
    customer: data.customer,
    vehicle: data.vehicle,
    symptoms: data.symptoms,
    preferred: data.preferred,
    consent: data.consent,
    photos: data.photos ?? [],
    source: data.source,
    ipHash: data.ipHash,
    schemaVersion: data.schemaVersion,
    notes: Array.isArray(data.notes) ? data.notes : [],
    statusUpdatedAt: data.statusUpdatedAt ?? null,
    createdAt,
  };
}

export interface BookingFilter {
  status?: BookingStatus;
  /** Free-text match against reference, customer name/phone/email, VRM. */
  q?: string;
}

/**
 * Fetches by businessId (+ status, when filtered) and matches search text
 * server-side over the already-loaded page, same "no search index/service"
 * approach as the public `/search` route in Phase 2.
 */
export async function listBookingsAdmin(filter: BookingFilter = {}): Promise<AdminBooking[]> {
  let query: FirebaseFirestore.Query = getDb()
    .collection("bookings")
    .where("businessId", "==", businessId());
  if (filter.status) query = query.where("status", "==", filter.status);
  query = query.orderBy("createdAt", "desc").limit(200);
  const snap = await query.get();
  let items = snap.docs.map((d) => fromDoc(d.id, d.data()));
  const q = filter.q?.trim().toLowerCase();
  if (q) {
    items = items.filter((b) =>
      [b.reference, b.customer.name, b.customer.phone, b.customer.email, b.vehicle.vrm, b.vehicle.make, b.vehicle.model]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  return items;
}

export async function getBookingAdmin(id: string): Promise<AdminBooking | null> {
  if (!isDocId(id)) return null;
  const snap = await getDb().collection("bookings").doc(id).get();
  const data = snap.data();
  if (!snap.exists || !data || data.businessId !== businessId()) return null;
  return fromDoc(snap.id, data);
}

export async function updateBookingStatusAdmin(
  id: string,
  status: BookingStatus,
  actor: Pick<StaffSession, "uid" | "email" | "role">,
): Promise<void> {
  if (!isDocId(id)) throw new AdminNotFoundError("Booking not found.");
  const ref = getDb().collection("bookings").doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.businessId !== businessId()) throw new AdminNotFoundError("Booking not found.");
  const now = new Date().toISOString();
  await ref.update({ status, statusUpdatedAt: now });
  await writeAuditLog(actor, "booking.status", { type: "booking", id }, { status });
}

export async function addBookingNoteAdmin(
  id: string,
  text: string,
  actor: Pick<StaffSession, "uid" | "email" | "role">,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Note text is required.");
  if (trimmed.length > 2000) throw new Error("Note is too long.");
  if (!isDocId(id)) throw new AdminNotFoundError("Booking not found.");
  const ref = getDb().collection("bookings").doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.businessId !== businessId()) throw new AdminNotFoundError("Booking not found.");
  const note: BookingNote = {
    id: randomUUID(),
    text: trimmed,
    authorUid: actor.uid,
    authorEmail: actor.email ?? null,
    at: new Date().toISOString(),
  };
  await ref.update({ notes: FieldValue.arrayUnion(note) });
  await writeAuditLog(actor, "booking.note", { type: "booking", id });
}

export async function countBookingsByStatus(status: BookingStatus): Promise<number> {
  const snap = await getDb()
    .collection("bookings")
    .where("businessId", "==", businessId())
    .where("status", "==", status)
    .count()
    .get();
  return snap.data().count;
}

export async function listRecentBookings(limit = 5): Promise<AdminBooking[]> {
  const snap = await getDb()
    .collection("bookings")
    .where("businessId", "==", businessId())
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => fromDoc(d.id, d.data()));
}

export interface BookingPhotoLink {
  url: string;
  contentType: string;
}

const PHOTO_LINK_TTL_MS = 15 * 60 * 1000;

/**
 * Short-lived (15 min) signed read URLs for a booking's private photos. Only
 * paths inside this booking's own upload folder are ever signed. A failure is
 * logged and returns no links rather than breaking the booking page.
 */
export async function getBookingPhotoLinks(booking: Pick<AdminBooking, "id" | "photos">): Promise<BookingPhotoLink[] | null> {
  const prefix = `booking-uploads/${booking.id}/`;
  const photos = booking.photos.filter((p) => typeof p.path === "string" && p.path.startsWith(prefix) && !p.path.includes(".."));
  if (photos.length === 0) return [];
  try {
    const bucket = getBucket();
    const expires = Date.now() + PHOTO_LINK_TTL_MS;
    return await Promise.all(
      photos.map(async (p) => {
        const [url] = await bucket.file(p.path).getSignedUrl({ version: "v4", action: "read", expires });
        return { url, contentType: p.contentType };
      }),
    );
  } catch (err) {
    logServerError("admin.booking.photo-links", err, { id: booking.id });
    return null;
  }
}
