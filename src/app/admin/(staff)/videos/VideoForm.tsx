"use client";

import { useState } from "react";
import type { ContentCategory, Video } from "@/lib/models";
import { extractYoutubeId } from "@/lib/admin/youtube";
import { saveVideoAction, type ActionState } from "./actions";
import { FieldError, fieldProps, FormMessage, inputClass, labelClass, Req } from "../../_components/ui";
import { useAdminForm } from "../../_components/useAdminForm";
import { EditorActions } from "../../_components/EditorActions";
import { CategoryPicker } from "../../_components/CategoryPicker";
import { CopyUrlButton } from "../../_components/CopyUrlButton";

const initialState: ActionState = {};
const csv = (v?: string[]) => (v ?? []).join(", ");

export function VideoForm({
  video,
  categories,
  guideUrl,
}: {
  video?: Video;
  categories: ContentCategory[];
  /** Public URL of the related (published) guide, for pasting into the YouTube description. */
  guideUrl?: string;
}) {
  const action = saveVideoAction.bind(null, video?.id ?? null);
  const { state, pending, formProps } = useAdminForm(action, initialState);
  const [urlInput, setUrlInput] = useState(video?.youtubeUrl ?? "");
  const previewId = extractYoutubeId(urlInput);

  return (
    <form {...formProps} className="flex flex-col gap-space-lg">
      <label className={labelClass}>
        <span>YouTube URL (watch, youtu.be, shorts or embed — or a bare video ID)<Req /></span>
        <input
          {...fieldProps(state.fieldErrors, "youtubeUrl")}
          defaultValue={video?.youtubeUrl}
          required
          onChange={(e) => setUrlInput(e.target.value)}
          className={inputClass}
        />
        <FieldError errors={state.fieldErrors} name="youtubeUrl" />
      </label>
      {urlInput &&
        (previewId ? (
          <p className="font-code text-body-sm text-status-pass-green">Recognised video ID: {previewId}</p>
        ) : (
          <p className="font-code text-body-sm text-status-fault-red">Not a recognised YouTube URL or ID yet.</p>
        ))}

      <div className="grid gap-space-md sm:grid-cols-2">
        <label className={labelClass}>
          <span>Title<Req /></span>
          <input {...fieldProps(state.fieldErrors, "title")} defaultValue={video?.title} required maxLength={160} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="title" />
        </label>
        <label className={labelClass}>
          <span>Slug<Req /></span>
          <input {...fieldProps(state.fieldErrors, "slug")} defaultValue={video?.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={inputClass} />
          <FieldError errors={state.fieldErrors} name="slug" />
        </label>
      </div>

      <label className={labelClass}>
        Description
        <textarea {...fieldProps(state.fieldErrors, "description")} defaultValue={video?.description} maxLength={2000} rows={3} className={inputClass} />
        <FieldError errors={state.fieldErrors} name="description" />
      </label>

      <label className={labelClass}>
        Thumbnail override URL (optional — defaults to the YouTube thumbnail)
        <input {...fieldProps(state.fieldErrors, "thumbnail")} type="url" defaultValue={video?.thumbnail} className={inputClass} />
        <FieldError errors={state.fieldErrors} name="thumbnail" />
      </label>

      <div className="grid gap-space-md sm:grid-cols-3">
        <label className={labelClass}>
          Vehicle make
          <input {...fieldProps(state.fieldErrors, "vehicleMake")} defaultValue={video?.vehicleMake} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="vehicleMake" />
        </label>
        <label className={labelClass}>
          Vehicle model
          <input {...fieldProps(state.fieldErrors, "vehicleModel")} defaultValue={video?.vehicleModel} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="vehicleModel" />
        </label>
        <label className={labelClass}>
          Category
          <input {...fieldProps(state.fieldErrors, "category")} defaultValue={video?.category} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="category" />
        </label>
      </div>

      <div className="grid gap-space-md sm:grid-cols-3">
        <label className={labelClass}>
          Related guide slug
          <input {...fieldProps(state.fieldErrors, "relatedGuideSlug")} defaultValue={video?.relatedGuideSlug} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="relatedGuideSlug" />
        </label>
        <label className={labelClass}>
          Related fault codes (comma-separated)
          <input {...fieldProps(state.fieldErrors, "relatedFaultCodes")} defaultValue={csv(video?.relatedFaultCodes)} placeholder="P0420, P268172" className={inputClass} />
          <FieldError errors={state.fieldErrors} name="relatedFaultCodes" />
        </label>
        <label className={labelClass}>
          Published on YouTube (date, if known)
          <input {...fieldProps(state.fieldErrors, "uploadDate")} type="date" defaultValue={video?.uploadDate} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="uploadDate" />
        </label>
      </div>

      <label className={labelClass}>
        Duration from YouTube (optional, ISO 8601, e.g. PT8M12S)
        <input {...fieldProps(state.fieldErrors, "duration")} defaultValue={video?.duration} pattern="PT(\d+H)?(\d+M)?(\d+S)?" className={inputClass} />
        <FieldError errors={state.fieldErrors} name="duration" />
      </label>

      <CategoryPicker categories={categories} selected={video?.categorySlugs} errors={state.fieldErrors} />

      {guideUrl && (
        <p className="flex flex-wrap items-center gap-space-sm rounded border border-border-subtle bg-surface-raised p-space-md text-body-sm">
          <span className="text-text-muted">Related guide for the YouTube description:</span>
          <span className="font-code text-text-primary">{guideUrl}</span>
          <CopyUrlButton url={guideUrl} label="Copy guide URL" />
        </p>
      )}

      <div className="grid gap-space-md sm:grid-cols-3">
        <label className={labelClass}>
          Display order
          <input {...fieldProps(state.fieldErrors, "order")} type="number" defaultValue={video?.order} className={inputClass} />
          <FieldError errors={state.fieldErrors} name="order" />
        </label>
      </div>

      {video && (
        <p className="font-code text-body-sm text-text-muted">
          Created {video.createdAt ? new Date(video.createdAt).toLocaleString("en-GB") : "—"} · Updated{" "}
          {video.updatedAt ? new Date(video.updatedAt).toLocaleString("en-GB") : "—"}
        </p>
      )}

      <FormMessage error={state.error} success={state.success} />
      <EditorActions pending={pending} status={video?.status} noun="video" />
    </form>
  );
}
