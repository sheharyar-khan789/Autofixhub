"use client";

import { sendPasswordResetEmail } from "firebase/auth";
import { useState } from "react";
import { getClientAuth, isClientFirebaseConfigured } from "@/lib/firebase/client";
import { FormMessage, secondaryBtn } from "../../_components/ui";

/** Sends Firebase's own password-reset email to the signed-in staff member. */
export function PasswordResetButton({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  if (!isClientFirebaseConfigured()) return null;
  return (
    <div className="flex flex-col items-start gap-space-sm">
      <button
        type="button"
        className={secondaryBtn}
        disabled={state === "sending"}
        onClick={async () => {
          setState("sending");
          try {
            await sendPasswordResetEmail(await getClientAuth(), email);
            setState("sent");
          } catch {
            setState("error");
          }
        }}
      >
        {state === "sending" ? "Sending…" : "Email me a password reset link"}
      </button>
      {state === "sent" && <FormMessage success={`A reset link was sent to ${email}.`} />}
      {state === "error" && <FormMessage error="The reset email couldn't be sent. Try again in a few minutes." />}
    </div>
  );
}
