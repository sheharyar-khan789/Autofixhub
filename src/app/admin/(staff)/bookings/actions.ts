"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { BOOKINGS_ROLES } from "@/lib/auth/permissions";
import { isNotConfigured } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import { adminErrorMessage } from "@/lib/admin/content";
import { invalid, type FormState } from "@/lib/admin/forms";
import { addBookingNoteAdmin, updateBookingStatusAdmin } from "@/lib/admin/bookings";
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/models";

function isBookingStatus(v: unknown): v is BookingStatus {
  return typeof v === "string" && (BOOKING_STATUSES as readonly string[]).includes(v);
}

export type ActionState = FormState;

export async function updateBookingStatusAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole(BOOKINGS_ROLES);
  const status = formData.get("status");
  if (!isBookingStatus(status)) return invalid({ status: "Choose a valid status." });
  try {
    await updateBookingStatusAdmin(id, status, session);
  } catch (err) {
    if (isNotConfigured(err)) return { error: "Firebase Admin is not configured here." };
    logServerError("admin.booking.status-action", err, { id });
    return { error: adminErrorMessage(err, "Could not update the status. Try again.") };
  }
  revalidatePath(`/admin/bookings/${id}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  return { success: "Status updated." };
}

export async function addBookingNoteAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole(BOOKINGS_ROLES);
  const text = String(formData.get("text") ?? "");
  if (!text.trim()) return invalid({ text: "Write a note before saving." });
  try {
    await addBookingNoteAdmin(id, text, session);
  } catch (err) {
    if (isNotConfigured(err)) return { error: "Firebase Admin is not configured here." };
    logServerError("admin.booking.note-action", err, { id });
    return { error: adminErrorMessage(err, "Could not save the note. Try again.") };
  }
  revalidatePath(`/admin/bookings/${id}`);
  return { success: "Note added." };
}
