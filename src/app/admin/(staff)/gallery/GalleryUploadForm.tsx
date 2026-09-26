"use client";

import { useActionState } from "react";
import { uploadGalleryImageAction, type ActionState } from "./actions";
import { FormMessage, inputClass, labelClass } from "../../_components/ui";
import { SubmitButton } from "../../_components/SubmitButton";

const initialState: ActionState = {};

export function GalleryUploadForm() {
  const [state, formAction] = useActionState(uploadGalleryImageAction, initialState);

  return (
    <form action={formAction} className="grid gap-space-md rounded-lg border border-border-medium p-space-lg sm:grid-cols-5">
      <label className={`${labelClass} sm:col-span-2`}>
        Image (JPEG, PNG or WebP)
        <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required className={inputClass} />
      </label>
      <label className={labelClass}>
        Caption
        <input name="caption" maxLength={200} className={inputClass} />
      </label>
      <label className={labelClass}>
        Category
        <input name="category" maxLength={80} className={inputClass} />
      </label>
      <label className={labelClass}>
        Order
        <input name="order" type="number" defaultValue={0} className={inputClass} />
      </label>
      <label className={labelClass}>
        Status
        <select name="status" defaultValue="draft" className={inputClass}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </label>
      <div className="flex items-center gap-space-md sm:col-span-5">
        <SubmitButton pendingLabel="Uploading…">Upload</SubmitButton>
        <FormMessage error={state.error} success={state.success} />
      </div>
    </form>
  );
}
