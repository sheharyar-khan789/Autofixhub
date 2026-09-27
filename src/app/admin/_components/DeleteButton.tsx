"use client";

import { useActionState } from "react";
import { ConfirmSubmitButton } from "./ConfirmSubmitButton";
import { dangerBtn, FormMessage } from "./ui";

export interface DeleteActionState {
  error?: string;
  success?: string;
}

/**
 * Delete with an accessible confirmation dialog. Errors are shown inline; on success
 * the row disappears (revalidation), or the action redirects to `redirectTo` (e.g. from an edit page).
 */
export function DeleteButton({
  action,
  id,
  confirmMessage,
  label = "Delete",
  redirectTo,
  variant = "row",
}: {
  action: (prev: DeleteActionState, formData: FormData) => Promise<DeleteActionState>;
  id: string;
  confirmMessage: string;
  label?: string;
  redirectTo?: string;
  variant?: "row" | "button";
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-space-sm">
      <input type="hidden" name="id" value={id} />
      {/* The action redirects here on success. A client-side redirect would race the action's
          refresh of the current (now deleted) page and could leave a 404 on screen. */}
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      <ConfirmSubmitButton
        confirmMessage={confirmMessage}
        title="Delete permanently?"
        className={
          variant === "button"
            ? dangerBtn
            : "inline-flex min-h-9 items-center rounded px-space-sm text-body-sm font-semibold text-status-fault-red transition-colors hover:bg-status-fault-red/10"
        }
      >
        {label}
      </ConfirmSubmitButton>
      <FormMessage error={state.error} />
    </form>
  );
}
