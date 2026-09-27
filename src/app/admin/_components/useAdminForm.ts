"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import type { FormState } from "@/lib/admin/forms";

/**
 * Admin form submission that never loses what staff typed.
 *
 * React resets a form after every submission made through its `action` prop, even one
 * that failed validation. Here the submit is dispatched from `onSubmit` instead, so the
 * inputs keep their values on error; the form is only reset after a successful save
 * when `resetOnSuccess` is set (forms that redirect on success need no reset). The
 * clicked button is sent too, so `intent` (Save draft / Publish) still reaches the action.
 * `action` stays on the form so it still submits before hydration.
 */
export function useAdminForm(
  action: (prev: FormState, formData: FormData) => Promise<FormState>,
  initialState: FormState,
  { resetOnSuccess = false }: { resetOnSuccess?: boolean } = {},
) {
  const [state, dispatch, pending] = useActionState(action, initialState);
  const ref = useRef<HTMLFormElement>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  }

  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    if (state.success && resetOnSuccess) form.reset();
    const first = Object.keys(state.fieldErrors ?? {})[0];
    if (!first) return;
    const el = form.elements.namedItem(first);
    const target = el instanceof RadioNodeList ? el[0] : el;
    if (target instanceof HTMLElement) target.focus();
  }, [state, resetOnSuccess]);

  return { state, pending, formProps: { ref, action: dispatch, onSubmit } };
}
