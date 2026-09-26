"use client";

import { useActionState } from "react";
import { deleteServiceAction, type ActionState } from "./actions";
import { ConfirmSubmitButton } from "../../_components/ConfirmSubmitButton";
import { FormMessage } from "../../_components/ui";

const initialState: ActionState = {};

export function DeleteServiceButton({ id, name }: { id: string; name: string }) {
  const [state, formAction] = useActionState(deleteServiceAction, initialState);
  return (
    <form action={formAction} className="flex items-center gap-space-sm">
      <input type="hidden" name="id" value={id} />
      <ConfirmSubmitButton
        confirmMessage={`Delete "${name}"? This can't be undone.`}
        className="text-body-sm text-status-fault-red hover:underline"
      >
        Delete
      </ConfirmSubmitButton>
      <FormMessage error={state.error} />
    </form>
  );
}
