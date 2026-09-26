"use client";

import { useFormStatus } from "react-dom";
import { primaryBtn } from "./ui";

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  className = primaryBtn,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
