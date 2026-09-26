"use client";

import { useActionState } from "react";
import type { Review } from "@/lib/models";
import { REVIEW_SOURCES } from "@/lib/models";
import { saveReviewAction, type ActionState } from "./actions";
import { FormMessage, inputClass, labelClass } from "../../_components/ui";
import { SubmitButton } from "../../_components/SubmitButton";

const initialState: ActionState = {};

export function ReviewForm({ review }: { review?: Review }) {
  const action = saveReviewAction.bind(null, review?.id ?? null);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-space-lg">
      <div className="grid gap-space-md sm:grid-cols-2">
        <label className={labelClass}>
          Customer name
          <input name="name" defaultValue={review?.name} required maxLength={120} className={inputClass} />
        </label>
        <label className={labelClass}>
          Rating
          <select name="rating" defaultValue={review?.rating ?? 5} className={inputClass}>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {"★".repeat(r)} ({r})
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={labelClass}>
        Review text
        <textarea name="review" defaultValue={review?.review} required maxLength={2000} rows={4} className={inputClass} />
      </label>

      <div className="grid gap-space-md sm:grid-cols-3">
        <label className={labelClass}>
          Date
          <input name="date" type="date" defaultValue={review?.date} required className={inputClass} />
        </label>
        <label className={labelClass}>
          Source
          <select name="source" defaultValue={review?.source ?? "google"} className={inputClass}>
            {REVIEW_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Status
          <select name="status" defaultValue={review?.status ?? "draft"} className={inputClass}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>

      <div className="flex items-center gap-space-md">
        <SubmitButton>{review ? "Save changes" : "Add review"}</SubmitButton>
        <FormMessage error={state.error} success={state.success} />
      </div>
    </form>
  );
}
