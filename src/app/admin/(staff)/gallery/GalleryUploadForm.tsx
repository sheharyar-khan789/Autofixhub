"use client";

import { uploadGalleryImageAction, type ActionState } from "./actions";
import { FieldError, fieldProps, FormMessage, inputClass, labelClass } from "../../_components/ui";
import { useAdminForm } from "../../_components/useAdminForm";
import { SubmitButton } from "../../_components/SubmitButton";

const initialState: ActionState = {};

export function GalleryUploadForm() {
  const { state, pending, formProps } = useAdminForm(uploadGalleryImageAction, initialState, { resetOnSuccess: true });

  return (
    <form {...formProps} className="grid gap-space-md rounded-lg border border-border-medium p-space-lg sm:grid-cols-5">
      <label className={`${labelClass} sm:col-span-2`}>
        Image (JPEG, PNG or WebP)
        <input type="file" {...fieldProps(state.fieldErrors, "file")} accept="image/jpeg,image/png,image/webp" required className={inputClass} />
        <FieldError errors={state.fieldErrors} name="file" />
      </label>
      <label className={labelClass}>
        Caption
        <input {...fieldProps(state.fieldErrors, "caption")} maxLength={200} className={inputClass} />
        <FieldError errors={state.fieldErrors} name="caption" />
      </label>
      <label className={labelClass}>
        Category
        <input {...fieldProps(state.fieldErrors, "category")} maxLength={80} className={inputClass} />
        <FieldError errors={state.fieldErrors} name="category" />
      </label>
      <label className={labelClass}>
        Order
        <input {...fieldProps(state.fieldErrors, "order")} type="number" defaultValue={0} className={inputClass} />
        <FieldError errors={state.fieldErrors} name="order" />
      </label>
      <label className={labelClass}>
        Status
        <select {...fieldProps(state.fieldErrors, "status")} defaultValue="draft" className={inputClass}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <FieldError errors={state.fieldErrors} name="status" />
      </label>
      <div className="flex items-center gap-space-md sm:col-span-5">
        <SubmitButton pending={pending} pendingLabel="Uploading…">Upload</SubmitButton>
        <FormMessage error={state.error} success={state.success} />
      </div>
    </form>
  );
}
