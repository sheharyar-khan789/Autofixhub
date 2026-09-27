"use client";

import type { Review } from "@/lib/models";
import { REVIEW_SOURCES } from "@/lib/models";
import { saveReviewAction, type ActionState } from "./actions";
import { FieldError, fieldProps, FormMessage, inputClass, labelClass } from "../../_components/ui";
import { useAdminForm } from "../../_components/useAdminForm";
import { SubmitButton } from "../../_components/SubmitButton";

const initialState: ActionState = {};

export function ReviewForm({ review }: { review?: Review }) {
  const action = saveReviewAction.bind(null, review?.id ?? null);
  const { state, pending, formProps } = useAdminForm(action, initialState);

  return (
    <form {...formProps} className="flex flex-col gap-space-lg">
      <div className="grid gap-space-md sm:grid-cols-2">
        <label className={labelClass}>
          Customer name
          <input {...fieldProps(state.fieldErrors, "name")} defaultValue={review?.name} required maxLength={120} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="name" />
        </label>
        <label className={labelClass}>
          Rating
          <select {...fieldProps(state.fieldErrors, "rating")} defaultValue={review?.rating ?? 5} className={inputClass}>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {"★".repeat(r)} ({r})
              </option>
            ))}
          </select>
          <FieldError errors={state.fieldErrors} name="rating" />
        </label>
      </div>

      <label className={labelClass}>
        Review text
        <textarea {...fieldProps(state.fieldErrors, "review")} defaultValue={review?.review} required maxLength={2000} rows={4} className={inputClass} />
        <FieldError errors={state.fieldErrors} name="review" />
      </label>

      <div className="grid gap-space-md sm:grid-cols-3">
        <label className={labelClass}>
          Date
          <input {...fieldProps(state.fieldErrors, "date")} type="date" defaultValue={review?.date} required className={inputClass} />
          <FieldError errors={state.fieldErrors} name="date" />
        </label>
        <label className={labelClass}>
          Source
          <select {...fieldProps(state.fieldErrors, "source")} defaultValue={review?.source ?? "google"} className={inputClass}>
            {REVIEW_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <FieldError errors={state.fieldErrors} name="source" />
        </label>
        <label className={labelClass}>
          Status
          <select {...fieldProps(state.fieldErrors, "status")} defaultValue={review?.status ?? "draft"} className={inputClass}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <FieldError errors={state.fieldErrors} name="status" />
        </label>
      </div>

      <div className="flex items-center gap-space-md">
        <SubmitButton pending={pending}>{review ? "Save changes" : "Add review"}</SubmitButton>
        <FormMessage error={state.error} success={state.success} />
      </div>
    </form>
  );
}
