"use client";

import type { ContentCategory, FaultCode } from "@/lib/models";
import { saveFaultCodeAction, type ActionState } from "./actions";
import { FieldError, fieldProps, FormMessage, inputClass, labelClass, Req } from "../../_components/ui";
import { useAdminForm } from "../../_components/useAdminForm";
import { EditorActions } from "../../_components/EditorActions";
import { CategoryPicker } from "../../_components/CategoryPicker";

const initialState: ActionState = {};
const lines = (v?: string[]) => (v ?? []).join("\n");
const csv = (v?: string[]) => (v ?? []).join(", ");

export function FaultCodeForm({ faultCode, categories }: { faultCode?: FaultCode; categories: ContentCategory[] }) {
  const action = saveFaultCodeAction.bind(null, faultCode?.id ?? null);
  const { state, pending, formProps } = useAdminForm(action, initialState);

  return (
    <form {...formProps} className="flex flex-col gap-space-lg">
      <div className="grid gap-space-md sm:grid-cols-3">
        <label className={labelClass}>
          <span>Code (e.g. P0301)<Req /></span>
          <input {...fieldProps(state.fieldErrors, "code")} defaultValue={faultCode?.code} required pattern="[A-Za-z][0-9A-Za-z]{4}" className={`${inputClass} font-code uppercase`} />
          <FieldError errors={state.fieldErrors} name="code" />
        </label>
        <label className={labelClass}>
          <span>Title<Req /></span>
          <input {...fieldProps(state.fieldErrors, "title")} defaultValue={faultCode?.title} required maxLength={160} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="title" />
        </label>
        <label className={labelClass}>
          Scope
          <select {...fieldProps(state.fieldErrors, "scope")} defaultValue={faultCode?.scope ?? "generic"} className={inputClass}>
            <option value="generic">Generic (SAE)</option>
            <option value="manufacturer-specific">Manufacturer-specific</option>
          </select>
          <FieldError errors={state.fieldErrors} name="scope" />
        </label>
      </div>

      <label className={labelClass}>
        <span>Meaning<Req /></span>
        <textarea {...fieldProps(state.fieldErrors, "meaning")} defaultValue={faultCode?.meaning} required maxLength={2000} rows={4} className={inputClass} />
        <FieldError errors={state.fieldErrors} name="meaning" />
      </label>

      <div className="grid gap-space-md sm:grid-cols-3">
        <label className={labelClass}>
          Symptoms (one per line)
          <textarea {...fieldProps(state.fieldErrors, "symptoms")} defaultValue={lines(faultCode?.symptoms)} rows={4} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="symptoms" />
        </label>
        <label className={labelClass}>
          Possible causes (one per line)
          <textarea {...fieldProps(state.fieldErrors, "possibleCauses")} defaultValue={lines(faultCode?.possibleCauses)} rows={4} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="possibleCauses" />
        </label>
        <label className={labelClass}>
          Diagnostic steps (one per line)
          <textarea {...fieldProps(state.fieldErrors, "diagnosticSteps")} defaultValue={lines(faultCode?.diagnosticSteps)} rows={4} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="diagnosticSteps" />
        </label>
      </div>

      <label className={labelClass}>
        Related vehicles (one per line)
        <textarea {...fieldProps(state.fieldErrors, "relatedVehicles")} defaultValue={lines(faultCode?.relatedVehicles)} rows={2} className={inputClass} />
        <FieldError errors={state.fieldErrors} name="relatedVehicles" />
      </label>

      <div className="grid gap-space-md sm:grid-cols-3">
        <label className={labelClass}>
          Related guide slugs (comma-separated)
          <input {...fieldProps(state.fieldErrors, "relatedGuideSlugs")} defaultValue={csv(faultCode?.relatedGuideSlugs)} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="relatedGuideSlugs" />
        </label>
        <label className={labelClass}>
          System (e.g. Exhaust / emissions)
          <input {...fieldProps(state.fieldErrors, "system")} defaultValue={faultCode?.system} maxLength={80} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="system" />
        </label>
        <label className={labelClass}>
          Related video IDs (comma-separated)
          <input {...fieldProps(state.fieldErrors, "relatedVideoIds")} defaultValue={csv(faultCode?.relatedVideoIds)} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="relatedVideoIds" />
        </label>
      </div>

      <label className={labelClass}>
        Important notes / warnings (one per line)
        <textarea {...fieldProps(state.fieldErrors, "notes")} defaultValue={lines(faultCode?.notes)} rows={3} className={inputClass} />
        <FieldError errors={state.fieldErrors} name="notes" />
      </label>

      <CategoryPicker categories={categories} selected={faultCode?.categorySlugs} errors={state.fieldErrors} />

      <fieldset className="flex flex-col gap-space-sm rounded border border-border-medium p-space-md">
        <legend className="px-space-xs font-code text-label-code text-text-muted">SEO</legend>
        <label className={labelClass}>
          SEO title
          <input {...fieldProps(state.fieldErrors, "seoTitle")} defaultValue={faultCode?.seoTitle} maxLength={70} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="seoTitle" />
        </label>
        <label className={labelClass}>
          Meta description
          <textarea {...fieldProps(state.fieldErrors, "seoDescription")} defaultValue={faultCode?.seoDescription} maxLength={160} rows={2} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="seoDescription" />
        </label>
      </fieldset>

      {faultCode && (
        <p className="font-code text-body-sm text-text-muted">
          Created {faultCode.createdAt ? new Date(faultCode.createdAt).toLocaleString("en-GB") : "—"} · Updated{" "}
          {faultCode.updatedAt ? new Date(faultCode.updatedAt).toLocaleString("en-GB") : "—"}
        </p>
      )}

      <FormMessage error={state.error} success={state.success} />
      <EditorActions pending={pending} status={faultCode?.status} noun="fault code" />
    </form>
  );
}
