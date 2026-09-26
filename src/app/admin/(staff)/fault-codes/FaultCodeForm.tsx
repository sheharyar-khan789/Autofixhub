"use client";

import { useActionState } from "react";
import type { ContentCategory, FaultCode } from "@/lib/models";
import { saveFaultCodeAction, type ActionState } from "./actions";
import { FormMessage, inputClass, labelClass, Req } from "../../_components/ui";
import { EditorActions } from "../../_components/EditorActions";
import { CategoryPicker } from "../../_components/CategoryPicker";

const initialState: ActionState = {};
const lines = (v?: string[]) => (v ?? []).join("\n");
const csv = (v?: string[]) => (v ?? []).join(", ");

export function FaultCodeForm({ faultCode, categories }: { faultCode?: FaultCode; categories: ContentCategory[] }) {
  const action = saveFaultCodeAction.bind(null, faultCode?.id ?? null);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-space-lg">
      <div className="grid gap-space-md sm:grid-cols-3">
        <label className={labelClass}>
          <span>Code (e.g. P0301)<Req /></span>
          <input name="code" defaultValue={faultCode?.code} required pattern="[A-Za-z][0-9A-Za-z]{4}" className={`${inputClass} font-code uppercase`} />
        </label>
        <label className={labelClass}>
          <span>Title<Req /></span>
          <input name="title" defaultValue={faultCode?.title} required maxLength={160} className={inputClass} />
        </label>
        <label className={labelClass}>
          Scope
          <select name="scope" defaultValue={faultCode?.scope ?? "generic"} className={inputClass}>
            <option value="generic">Generic (SAE)</option>
            <option value="manufacturer-specific">Manufacturer-specific</option>
          </select>
        </label>
      </div>

      <label className={labelClass}>
        <span>Meaning<Req /></span>
        <textarea name="meaning" defaultValue={faultCode?.meaning} required maxLength={2000} rows={4} className={inputClass} />
      </label>

      <div className="grid gap-space-md sm:grid-cols-3">
        <label className={labelClass}>
          Symptoms (one per line)
          <textarea name="symptoms" defaultValue={lines(faultCode?.symptoms)} rows={4} className={inputClass} />
        </label>
        <label className={labelClass}>
          Possible causes (one per line)
          <textarea name="possibleCauses" defaultValue={lines(faultCode?.possibleCauses)} rows={4} className={inputClass} />
        </label>
        <label className={labelClass}>
          Diagnostic steps (one per line)
          <textarea name="diagnosticSteps" defaultValue={lines(faultCode?.diagnosticSteps)} rows={4} className={inputClass} />
        </label>
      </div>

      <label className={labelClass}>
        Related vehicles (one per line)
        <textarea name="relatedVehicles" defaultValue={lines(faultCode?.relatedVehicles)} rows={2} className={inputClass} />
      </label>

      <div className="grid gap-space-md sm:grid-cols-3">
        <label className={labelClass}>
          Related guide slugs (comma-separated)
          <input name="relatedGuideSlugs" defaultValue={csv(faultCode?.relatedGuideSlugs)} className={inputClass} />
        </label>
        <label className={labelClass}>
          System (e.g. Exhaust / emissions)
          <input name="system" defaultValue={faultCode?.system} maxLength={80} className={inputClass} />
        </label>
        <label className={labelClass}>
          Related video IDs (comma-separated)
          <input name="relatedVideoIds" defaultValue={csv(faultCode?.relatedVideoIds)} className={inputClass} />
        </label>
      </div>

      <label className={labelClass}>
        Important notes / warnings (one per line)
        <textarea name="notes" defaultValue={lines(faultCode?.notes)} rows={3} className={inputClass} />
      </label>

      <CategoryPicker categories={categories} selected={faultCode?.categorySlugs} />

      <fieldset className="flex flex-col gap-space-sm rounded border border-border-medium p-space-md">
        <legend className="px-space-xs font-code text-label-code text-text-muted">SEO</legend>
        <label className={labelClass}>
          SEO title
          <input name="seoTitle" defaultValue={faultCode?.seoTitle} maxLength={70} className={inputClass} />
        </label>
        <label className={labelClass}>
          Meta description
          <textarea name="seoDescription" defaultValue={faultCode?.seoDescription} maxLength={160} rows={2} className={inputClass} />
        </label>
      </fieldset>

      {faultCode && (
        <p className="font-code text-body-sm text-text-muted">
          Created {faultCode.createdAt ? new Date(faultCode.createdAt).toLocaleString("en-GB") : "—"} · Updated{" "}
          {faultCode.updatedAt ? new Date(faultCode.updatedAt).toLocaleString("en-GB") : "—"}
        </p>
      )}

      <FormMessage error={state.error} success={state.success} />
      <EditorActions status={faultCode?.status} noun="fault code" />
    </form>
  );
}
