"use client";

import type { ContentCategory } from "@/lib/models";
import { saveCategoryAction, type ActionState } from "./actions";
import { FieldError, fieldProps, FormMessage, inputClass, labelClass, Req } from "../../_components/ui";
import { useAdminForm } from "../../_components/useAdminForm";
import { EditorActions } from "../../_components/EditorActions";

const initialState: ActionState = {};

export function CategoryForm({ category }: { category?: ContentCategory }) {
  const action = saveCategoryAction.bind(null, category?.id ?? null);
  const { state, pending, formProps } = useAdminForm(action, initialState);
  return (
    <form {...formProps} className="flex flex-col gap-space-lg">
      <div className="grid gap-space-md sm:grid-cols-3">
        <label className={labelClass}>
          <span>Name<Req /></span>
          <input {...fieldProps(state.fieldErrors, "name")} defaultValue={category?.name} required maxLength={80} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="name" />
        </label>
        <label className={labelClass}>
          <span>Slug (URL: /categories/slug)<Req /></span>
          <input {...fieldProps(state.fieldErrors, "slug")} defaultValue={category?.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={inputClass} />
          <FieldError errors={state.fieldErrors} name="slug" />
        </label>
        <label className={labelClass}>
          Type
          <select {...fieldProps(state.fieldErrors, "kind")} defaultValue={category?.kind ?? "topic"} className={inputClass}>
            <option value="topic">Topic (system / problem)</option>
            <option value="vehicle">Vehicle (make / group)</option>
          </select>
          <FieldError errors={state.fieldErrors} name="kind" />
        </label>
      </div>
      <label className={labelClass}>
        Description
        <textarea {...fieldProps(state.fieldErrors, "description")} defaultValue={category?.description} maxLength={400} rows={2} className={inputClass} />
        <FieldError errors={state.fieldErrors} name="description" />
      </label>
      <div className="grid gap-space-md sm:grid-cols-2">
        <label className={labelClass}>
          Display order
          <input {...fieldProps(state.fieldErrors, "order")} type="number" defaultValue={category?.order ?? 0} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="order" />
        </label>
      </div>
      <fieldset className="flex flex-col gap-space-sm rounded border border-border-medium p-space-md">
        <legend className="px-space-xs font-code text-label-code text-text-muted">SEO</legend>
        <label className={labelClass}>
          SEO title
          <input {...fieldProps(state.fieldErrors, "seoTitle")} defaultValue={category?.seoTitle} maxLength={70} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="seoTitle" />
        </label>
        <label className={labelClass}>
          Meta description
          <textarea {...fieldProps(state.fieldErrors, "seoDescription")} defaultValue={category?.seoDescription} maxLength={160} rows={2} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="seoDescription" />
        </label>
      </fieldset>
      <p className="text-body-sm text-text-muted">
        A published category only gets a public page once at least one published guide, fault code or video is tagged with it.
      </p>
      <FormMessage error={state.error} success={state.success} />
      <EditorActions pending={pending} status={category?.status} noun="category" />
    </form>
  );
}
