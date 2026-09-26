"use client";

import Link from "next/link";
import { StateNotice } from "@/components/ui/Section";

/** Public error boundary: a user-safe message only, never the underlying error text. */
export default function PublicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="px-gutter py-space-xl">
      <div className="mx-auto flex max-w-3xl flex-col gap-space-md">
        <StateNotice title="Something went wrong" tone="error">
          This page could not be loaded. Please try again in a moment.
        </StateNotice>
        <div className="flex flex-wrap gap-space-md font-code text-body-sm">
          <button type="button" onClick={reset} className="font-semibold underline underline-offset-4">
            Try again
          </button>
          <Link href="/" className="font-semibold underline underline-offset-4">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
