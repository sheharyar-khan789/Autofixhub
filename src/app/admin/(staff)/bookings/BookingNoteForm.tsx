"use client";

import { useActionState, useRef } from "react";
import { addBookingNoteAction, type ActionState } from "./actions";
import { FormMessage, inputClass } from "../../_components/ui";
import { SubmitButton } from "../../_components/SubmitButton";

const initialState: ActionState = {};

export function BookingNoteForm({ id }: { id: string }) {
  const action = addBookingNoteAction.bind(null, id);
  const [state, formAction] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-space-sm"
    >
      <label className="flex flex-col gap-space-xs font-code text-label-code text-text-muted">
        Internal note (not shown to the customer)
        <textarea name="text" rows={3} required maxLength={2000} className={inputClass} />
      </label>
      <div className="flex items-center gap-space-md">
        <SubmitButton pendingLabel="Saving…">Add note</SubmitButton>
        <FormMessage error={state.error} success={state.success} />
      </div>
    </form>
  );
}
