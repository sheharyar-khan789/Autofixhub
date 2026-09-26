"use client";

import { useActionState } from "react";
import { FUEL_TYPES, FUEL_TYPE_LABELS, type ContentCategory, type Guide } from "@/lib/models";
import { formatFaqs } from "@/lib/admin/forms";
import { saveGuideAction, type ActionState } from "./actions";
import { FormMessage, inputClass, labelClass, Req } from "../../_components/ui";
import { EditorActions } from "../../_components/EditorActions";
import { CategoryPicker } from "../../_components/CategoryPicker";
import { CopyUrlButton } from "../../_components/CopyUrlButton";

const initialState: ActionState = {};
const lines = (v?: string[]) => (v ?? []).join("\n");
const csv = (v?: string[]) => (v ?? []).join(", ");
const fieldset = "flex flex-col gap-space-md rounded border border-border-medium p-space-md";
const legend = "px-space-xs font-code text-label-code text-text-muted";

export function GuideForm({
  guide,
  categories,
  publicUrl,
}: {
  guide?: Guide;
  categories: ContentCategory[];
  /** Absolute public URL, shown once the guide is published (for YouTube descriptions). */
  publicUrl?: string;
}) {
  const action = saveGuideAction.bind(null, guide?.id ?? null);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-space-lg">
      {publicUrl && (
        <p className="flex flex-wrap items-center gap-space-sm rounded border border-border-subtle bg-surface-raised p-space-md text-body-sm">
          <span className="text-text-muted">Public URL:</span>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="font-code text-text-primary underline">{publicUrl}</a>
          <CopyUrlButton url={publicUrl} label="Copy guide URL (for YouTube descriptions)" />
        </p>
      )}

      <div className="grid gap-space-md sm:grid-cols-2">
        <label className={labelClass}>
          <span>Title<Req /></span>
          <input name="title" defaultValue={guide?.title} required maxLength={160} className={inputClass} />
        </label>
        <label className={labelClass}>
          <span>Slug (URL: /guides/slug)<Req /></span>
          <input name="slug" defaultValue={guide?.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={inputClass} />
        </label>
      </div>

      <label className={labelClass}>
        <span>Summary (excerpt)<Req /></span>
        <textarea name="excerpt" defaultValue={guide?.excerpt} required maxLength={300} rows={2} className={inputClass} />
      </label>

      <label className={labelClass}>
        <span>Main content (blank line between paragraphs)<Req /></span>
        <textarea name="content" defaultValue={guide?.content} required maxLength={20000} rows={10} className={inputClass} />
      </label>

      <fieldset className={fieldset}>
        <legend className={legend}>Vehicle</legend>
        <div className="grid gap-space-md sm:grid-cols-3">
          <label className={labelClass}>
            Make
            <input name="vehicleMake" defaultValue={guide?.vehicleMake} className={inputClass} />
          </label>
          <label className={labelClass}>
            Model
            <input name="vehicleModel" defaultValue={guide?.vehicleModel} className={inputClass} />
          </label>
          <label className={labelClass}>
            Generation
            <input name="vehicleGeneration" defaultValue={guide?.vehicleGeneration} className={inputClass} />
          </label>
          <label className={labelClass}>
            Year from
            <input name="vehicleYearFrom" type="number" defaultValue={guide?.vehicleYearFrom} className={inputClass} />
          </label>
          <label className={labelClass}>
            Year to
            <input name="vehicleYearTo" type="number" defaultValue={guide?.vehicleYearTo} className={inputClass} />
          </label>
          <label className={labelClass}>
            Engine
            <input name="engine" defaultValue={guide?.engine} className={inputClass} />
          </label>
          <label className={labelClass}>
            Fuel type
            <select name="fuelType" defaultValue={guide?.fuelType ?? ""} className={inputClass}>
              <option value="">Not specified</option>
              {FUEL_TYPES.map((f) => (
                <option key={f} value={f}>{FUEL_TYPE_LABELS[f]}</option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            System / component
            <input name="problemCategory" defaultValue={guide?.problemCategory} className={inputClass} />
          </label>
        </div>
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>Problem and diagnosis</legend>
        <div className="grid gap-space-md sm:grid-cols-3">
          <label className={labelClass}>
            Symptoms (one per line)
            <textarea name="symptoms" defaultValue={lines(guide?.symptoms)} rows={4} className={inputClass} />
          </label>
          <label className={labelClass}>
            Possible causes (one per line)
            <textarea name="possibleCauses" defaultValue={lines(guide?.possibleCauses)} rows={4} className={inputClass} />
          </label>
          <label className={labelClass}>
            Recommended checks (one per line)
            <textarea name="recommendedChecks" defaultValue={lines(guide?.recommendedChecks)} rows={4} className={inputClass} />
          </label>
        </div>
        <label className={labelClass}>
          Diagnosis
          <textarea name="diagnosis" defaultValue={guide?.diagnosis} maxLength={8000} rows={5} className={inputClass} />
        </label>
        <label className={labelClass}>
          Repair information (only what you know first-hand)
          <textarea name="repairInfo" defaultValue={guide?.repairInfo} maxLength={8000} rows={5} className={inputClass} />
        </label>
        <label className={labelClass}>
          Important notes / warnings (one per line)
          <textarea name="warnings" defaultValue={lines(guide?.warnings)} rows={3} className={inputClass} />
        </label>
      </fieldset>

      <fieldset className={fieldset}>
        <legend className={legend}>Video and related content</legend>
        <label className={labelClass}>
          YouTube video URL (embedded on the guide)
          <input
            name="youtubeUrl"
            type="url"
            defaultValue={guide?.youtubeVideoId ? `https://www.youtube.com/watch?v=${guide.youtubeVideoId}` : ""}
            placeholder="https://www.youtube.com/watch?v=…"
            className={inputClass}
          />
        </label>
        <div className="grid gap-space-md sm:grid-cols-3">
          <label className={labelClass}>
            Fault codes (comma-separated)
            <input name="relatedFaultCodes" defaultValue={csv(guide?.relatedFaultCodes)} placeholder="P0401, P2002" className={inputClass} />
          </label>
          <label className={labelClass}>
            Related guide slugs (comma-separated)
            <input name="relatedGuideSlugs" defaultValue={csv(guide?.relatedGuideSlugs)} className={inputClass} />
          </label>
          <label className={labelClass}>
            Related video IDs (comma-separated)
            <input name="relatedVideoIds" defaultValue={csv(guide?.relatedVideoIds)} className={inputClass} />
          </label>
        </div>
        <CategoryPicker categories={categories} selected={guide?.categorySlugs} />
      </fieldset>

      <label className={labelClass}>
        FAQ (&quot;Q: …&quot; then &quot;A: …&quot;, blank line between questions)
        <textarea name="faqs" defaultValue={formatFaqs(guide?.faqs)} rows={5} className={inputClass} />
      </label>

      <div className="grid gap-space-md sm:grid-cols-3">
        <label className={labelClass}>
          Author
          <input name="author" defaultValue={guide?.author} className={inputClass} />
        </label>
        <label className={labelClass}>
          Featured image URL
          <input name="featuredImage" type="url" defaultValue={guide?.featuredImage} className={inputClass} />
        </label>
      </div>

      <fieldset className={fieldset}>
        <legend className={legend}>SEO</legend>
        <label className={labelClass}>
          SEO title
          <input name="seoTitle" defaultValue={guide?.seoTitle} maxLength={70} className={inputClass} />
        </label>
        <label className={labelClass}>
          Meta description
          <textarea name="seoDescription" defaultValue={guide?.seoDescription} maxLength={160} rows={2} className={inputClass} />
        </label>
        <div className="grid gap-space-md sm:grid-cols-2">
          <label className={labelClass}>
            Social share image URL (optional)
            <input name="ogImage" type="url" defaultValue={guide?.ogImage} className={inputClass} />
          </label>
          <label className={labelClass}>
            Canonical URL (only if first published elsewhere)
            <input name="canonicalUrl" type="url" defaultValue={guide?.canonicalUrl} className={inputClass} />
          </label>
        </div>
        <label className="inline-flex min-h-11 items-center gap-space-sm text-body-sm text-text-primary">
          <input type="checkbox" name="noindex" defaultChecked={guide?.noindex} className="h-4 w-4" />
          Hide from search engines (noindex, and left out of the sitemap)
        </label>
        <input type="hidden" name="order" value={guide?.order ?? ""} />
      </fieldset>

      {guide && (
        <p className="font-code text-body-sm text-text-muted">
          Created {guide.createdAt ? new Date(guide.createdAt).toLocaleString("en-GB") : "—"} · Updated{" "}
          {guide.updatedAt ? new Date(guide.updatedAt).toLocaleString("en-GB") : "—"} · First published{" "}
          {guide.publishedAt ? new Date(guide.publishedAt).toLocaleString("en-GB") : "not yet"}
        </p>
      )}

      <FormMessage error={state.error} success={state.success} />
      <EditorActions status={guide?.status} noun="guide" />
    </form>
  );
}
