"use client";

import { useActionState } from "react";
import { BOOKING_STATUSES, BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/models";
import { updateBookingStatusAction, type ActionState } from "./actions";
import { FormMessage, inputClass } from "../../_components/ui";
import { SubmitButton } from "../../_components/SubmitButton";

const initialState: ActionState = {};

export function BookingStatusForm({ id, current }: { id: string; current: BookingStatus }) {
  const action = updateBookingStatusAction.bind(null, id);
  const [state, formAction] = useActionState(action, initialState);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-space-md">
      <label className="flex flex-col gap-space-xs font-code text-label-code text-text-muted">
        Status
        <select name="status" defaultValue={current} className={inputClass}>
          {BOOKING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {BOOKING_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton pendingLabel="Updating…">Update status</SubmitButton>
      <FormMessage error={state.error} success={state.success} />
    </form>
  );
}
