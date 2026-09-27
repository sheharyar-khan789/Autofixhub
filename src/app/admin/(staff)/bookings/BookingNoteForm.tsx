"use client";

import { addBookingNoteAction, type ActionState } from "./actions";
import { FieldError, fieldProps, FormMessage, inputClass } from "../../_components/ui";
import { useAdminForm } from "../../_components/useAdminForm";
import { SubmitButton } from "../../_components/SubmitButton";

const initialState: ActionState = {};

export function BookingNoteForm({ id }: { id: string }) {
  const action = addBookingNoteAction.bind(null, id);
  // The note is cleared only once it has been saved; a failed save keeps the text.
  const { state, pending, formProps } = useAdminForm(action, initialState, { resetOnSuccess: true });
  return (
    <form {...formProps} className="flex flex-col gap-space-sm">
      <label className="flex flex-col gap-space-xs font-code text-label-code text-text-muted">
        Internal note (not shown to the customer)
        <textarea {...fieldProps(state.fieldErrors, "text")} rows={3} required maxLength={2000} className={inputClass} />
        <FieldError errors={state.fieldErrors} name="text" />
      </label>
      <div className="flex items-center gap-space-md">
        <SubmitButton pending={pending} pendingLabel="Saving…">Add note</SubmitButton>
        <FormMessage error={state.error} success={state.success} />
      </div>
    </form>
  );
}
