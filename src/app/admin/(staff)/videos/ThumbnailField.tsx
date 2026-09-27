"use client";

import { useEffect, useRef, useState } from "react";
import type { VideoType } from "@/lib/models";
import { thumbnailFileProblem } from "@/lib/validation/photos";
import { VIDEO_FRAME } from "@/components/content/videoFrame";
import { VideoThumbnail } from "@/components/content/VideoThumbnail";
import { FieldError, fieldProps, hintClass, inputClass, labelClass, secondaryBtn } from "../../_components/ui";

/**
 * Thumbnail upload for the video editor: preview in the video's own frame (16:9 or 9:16),
 * replace, remove, and an instant type/size check. Sends `thumbnailFile` (a new image) and
 * `thumbnailAction` ("remove" clears the saved one); the server re-checks the file itself.
 */
export function ThumbnailField({
  current,
  youtubeVideoId,
  videoType,
  serverError,
  formState,
}: {
  /** The saved custom thumbnail, if any. */
  current?: string;
  youtubeVideoId?: string;
  videoType: VideoType;
  serverError?: string;
  /** Identity of the latest action result, so a server error is hidden once the file changes. */
  formState: object;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [changedAfter, setChangedAfter] = useState<object | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function choose(file: File | undefined) {
    setChangedAfter(formState);
    setPreview(null);
    if (!file) return setClientError(null);
    const problem = thumbnailFileProblem(file);
    if (problem) {
      if (inputRef.current) inputRef.current.value = ""; // never submit a file we already know is wrong
      return setClientError(problem);
    }
    setClientError(null);
    setRemoved(false);
    setPreview(URL.createObjectURL(file));
  }

  function clearChosen() {
    if (inputRef.current) inputRef.current.value = "";
    choose(undefined);
  }

  const custom = preview ?? (removed ? undefined : current);
  const error = clientError ?? (changedAfter === formState ? undefined : serverError);
  const errors = error ? { thumbnailFile: error } : undefined;
  const source = preview
    ? "New image. It's uploaded when you save the video."
    : custom
      ? "Custom thumbnail."
      : removed
        ? "Custom thumbnail will be removed when you save; YouTube's thumbnail is used instead."
        : youtubeVideoId
          ? "YouTube's thumbnail (default, no custom image)."
          : "Enter the YouTube URL to see its default thumbnail.";

  return (
    <fieldset className="flex flex-col gap-space-sm rounded border border-border-medium p-space-md">
      <legend className="px-space-xs font-code text-label-code text-text-muted">Thumbnail</legend>
      <div className="flex flex-col gap-space-md sm:flex-row sm:items-start">
        <div
          data-testid="thumbnail-preview"
          data-video-frame={videoType}
          className={`relative shrink-0 overflow-hidden rounded border border-border-subtle bg-surface-card ${VIDEO_FRAME[videoType]} ${
            videoType === "short" ? "w-36 sm:w-44" : "w-full sm:w-80"
          }`}
        >
          <VideoThumbnail src={custom} youtubeVideoId={youtubeVideoId} eager />
        </div>
        <div className="flex min-w-0 flex-col gap-space-sm">
          <p className="text-body-sm text-text-primary" aria-live="polite">{source}</p>
          <label className={labelClass}>
            {current && !removed ? "Replace image" : "Upload image"}
            <input
              ref={inputRef}
              type="file"
              {...fieldProps(errors, "thumbnailFile")}
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => choose(e.target.files?.[0])}
              className={inputClass}
            />
            <FieldError errors={errors} name="thumbnailFile" />
          </label>
          <p className={hintClass}>
            JPEG, PNG or WebP, up to 2MB. Best size: 1280×720 for videos, 1080×1920 for Shorts. The image is cropped to fit the
            frame, never stretched.
          </p>
          <div className="flex flex-wrap gap-space-sm">
            {preview && (
              <button type="button" onClick={clearChosen} className={secondaryBtn}>
                Cancel new image
              </button>
            )}
            {!preview && current && !removed && (
              <button type="button" onClick={() => setRemoved(true)} className={secondaryBtn}>
                Remove thumbnail
              </button>
            )}
            {!preview && current && removed && (
              <button type="button" onClick={() => setRemoved(false)} className={secondaryBtn}>
                Keep current thumbnail
              </button>
            )}
          </div>
        </div>
      </div>
      <input type="hidden" name="thumbnailAction" value={removed && !preview ? "remove" : "keep"} />
    </fieldset>
  );
}
