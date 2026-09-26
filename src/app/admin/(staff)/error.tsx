"use client";

import { FormMessage, secondaryBtn } from "../_components/ui";

/**
 * Admin error boundary (e.g. a status toggle that failed). Server action errors
 * thrown with a staff-safe message are shown in development; production builds
 * replace every server error message with a generic one, so a fallback is shown.
 */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isGeneric = !error.message || error.message.startsWith("An error occurred in the Server Components render");
  return (
    <div className="flex flex-col gap-space-md">
      <h1 className="font-headline text-headline-md text-text-primary">Something went wrong</h1>
      <FormMessage error={isGeneric ? "That action could not be completed. Nothing else was changed. Try again." : error.message} />
      {error.digest && <p className="font-code text-label-telemetry text-text-muted">Reference: {error.digest}</p>}
      <div>
        <button type="button" onClick={reset} className={secondaryBtn}>
          Try again
        </button>
      </div>
    </div>
  );
}
