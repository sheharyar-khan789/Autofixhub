"use client";

import { useActionState } from "react";
import type { Service, ServiceCategory } from "@/lib/models";
import { saveServiceAction, type ActionState } from "./actions";
import { FormMessage, inputClass, labelClass } from "../../_components/ui";
import { SubmitButton } from "../../_components/SubmitButton";

const initialState: ActionState = {};

export function ServiceForm({ service, categories }: { service?: Service; categories: ServiceCategory[] }) {
  const action = saveServiceAction.bind(null, service?.id ?? null);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-space-lg">
      <div className="grid gap-space-md sm:grid-cols-2">
        <label className={labelClass}>
          Name
          <input name="name" defaultValue={service?.name} required className={inputClass} />
        </label>
        <label className={labelClass}>
          Slug
          <input
            name="slug"
            defaultValue={service?.slug}
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            title="Lowercase letters, numbers and hyphens only"
            className={inputClass}
          />
        </label>
      </div>

      <label className={labelClass}>
        Category
        <select name="categoryId" defaultValue={service?.categoryId} required className={inputClass}>
          <option value="" disabled>
            Choose a category
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        Summary (shown on cards and search)
        <textarea name="summary" defaultValue={service?.summary} required maxLength={300} rows={2} className={inputClass} />
      </label>

      <label className={labelClass}>
        Full description
        <textarea name="body" defaultValue={service?.body} maxLength={8000} rows={6} className={inputClass} />
      </label>

      <label className={labelClass}>
        Image URL
        <input name="image" type="url" defaultValue={service?.image} className={inputClass} />
      </label>

      <fieldset className="flex flex-col gap-space-sm rounded border border-border-medium p-space-md">
        <legend className="px-space-xs font-code text-label-code text-text-muted">Price</legend>
        <div className="grid gap-space-md sm:grid-cols-3">
          <label className={labelClass}>
            Display as
            <select name="priceMode" defaultValue={service?.priceMode ?? "quote"} className={inputClass}>
              <option value="quote">Quote on inspection</option>
              <option value="from">From a price</option>
              <option value="fixed">Fixed price</option>
            </select>
          </label>
          <label className={labelClass}>
            Price (£, leave blank for quote-only)
            <input
              name="pricePence"
              type="number"
              step="0.01"
              min="0"
              defaultValue={service?.pricePence != null ? (service.pricePence / 100).toFixed(2) : undefined}
              className={inputClass}
            />
          </label>
          <label className="flex items-end gap-space-xs font-code text-label-code text-text-muted">
            <input type="checkbox" name="vatIncluded" defaultChecked={service?.vatIncluded} />
            VAT included
          </label>
        </div>
      </fieldset>

      <div className="grid gap-space-md sm:grid-cols-3">
        <label className={labelClass}>
          Estimated duration (minutes)
          <input name="estimatedMinutes" type="number" min="1" defaultValue={service?.estimatedMinutes} className={inputClass} />
        </label>
        <label className={labelClass}>
          Display order
          <input name="order" type="number" defaultValue={service?.order ?? 0} className={inputClass} />
        </label>
        <label className={labelClass}>
          Status
          <select name="status" defaultValue={service?.status ?? "draft"} className={inputClass}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>

      <label className="flex items-center gap-space-xs font-code text-label-code text-text-muted">
        <input type="checkbox" name="bookable" defaultChecked={service?.bookable ?? true} />
        Customers can book this service online
      </label>

      <fieldset className="flex flex-col gap-space-sm rounded border border-border-medium p-space-md">
        <legend className="px-space-xs font-code text-label-code text-text-muted">SEO</legend>
        <label className={labelClass}>
          SEO title
          <input name="seoTitle" defaultValue={service?.seoTitle} maxLength={70} className={inputClass} />
        </label>
        <label className={labelClass}>
          SEO description
          <textarea name="seoDescription" defaultValue={service?.seoDescription} maxLength={160} rows={2} className={inputClass} />
        </label>
      </fieldset>

      <div className="flex items-center gap-space-md">
        <SubmitButton>{service ? "Save changes" : "Create service"}</SubmitButton>
        <FormMessage error={state.error} success={state.success} />
      </div>
    </form>
  );
}
