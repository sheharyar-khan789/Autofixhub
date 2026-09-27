"use client";

import { useFormStatus } from "react-dom";
import { primaryBtn } from "./ui";

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  className = primaryBtn,
  pending: pendingProp,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  /** From useAdminForm; useFormStatus only sees submissions made through the form's `action`. */
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
