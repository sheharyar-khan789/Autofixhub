"use client";

import { useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { dangerBtn, primaryBtn, secondaryBtn } from "./ui";

/**
 * A submit button that asks for confirmation in an accessible modal <dialog>
 * (focus is trapped, Escape cancels, focus returns to the button). The form only
 * submits after "Confirm", so destructive actions can't happen by accident.
 */
export function ConfirmSubmitButton({
  confirmMessage,
  confirmLabel = "Delete",
  title = "Are you sure?",
  tone = "danger",
  children,
  className = dangerBtn,
}: {
  confirmMessage: string;
  confirmLabel?: string;
  title?: string;
  tone?: "danger" | "primary";
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={pending}
        className={className}
        onClick={() => dialogRef.current?.showModal()}
      >
        {pending ? "Working…" : children}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClose={() => triggerRef.current?.focus()}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-border-medium bg-surface-card p-0 text-text-primary backdrop:bg-black/70"
      >
        <div className="flex flex-col gap-space-md p-space-lg">
          <h2 id={titleId} className="font-headline text-headline-sm">{title}</h2>
          <p id={descId} className="text-body-sm text-text-muted">{confirmMessage}</p>
          <div className="flex justify-end gap-space-sm">
            {/* autoFocus on Cancel: the safe choice is the default. */}
            <button type="button" autoFocus className={secondaryBtn} onClick={() => dialogRef.current?.close()}>
              Cancel
            </button>
            <button
              type="button"
              className={tone === "danger" ? `${dangerBtn} !bg-status-fault-red !text-text-primary` : primaryBtn}
              onClick={() => {
                const form = triggerRef.current?.form;
                dialogRef.current?.close();
                form?.requestSubmit();
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
