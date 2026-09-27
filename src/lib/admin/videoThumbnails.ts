import "server-only";
import { randomUUID } from "node:crypto";
import { businessId } from "@/lib/env";
import { getBucket } from "@/lib/firebase/admin";
import { logServerError } from "@/lib/logger";
import { PHOTO_EXTENSIONS, sniffImageType, thumbnailFileProblem } from "@/lib/validation/photos";

/** Where this business's uploaded video thumbnails live; nothing outside it is ever deleted. */
function prefix(): string {
  return `video-thumbnails/${businessId()}/`;
}

/**
 * Checks an uploaded thumbnail and reads it. Returns the bytes and real type, or a
 * staff-facing message. The declared type is only a first pass; the bytes decide.
 */
export async function readThumbnailFile(file: File): Promise<{ bytes: Uint8Array; type: keyof typeof PHOTO_EXTENSIONS } | { error: string }> {
  const problem = thumbnailFileProblem(file);
  if (problem) return { error: problem };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return { error: "That file isn't a real JPEG, PNG or WebP image." };
  return { bytes, type };
}

/**
 * Uploads through the Admin SDK (Storage rules deny all client access) and makes the object
 * publicly readable, like gallery photos: thumbnails are shown on the public site.
 */
export async function uploadVideoThumbnail(bytes: Uint8Array, type: keyof typeof PHOTO_EXTENSIONS): Promise<{ path: string; url: string }> {
  const bucket = getBucket();
  const path = `${prefix()}${randomUUID()}.${PHOTO_EXTENSIONS[type]}`;
  const file = bucket.file(path);
  await file.save(Buffer.from(bytes), {
    resumable: false,
    contentType: type,
    metadata: { cacheControl: "public, max-age=31536000, immutable" },
  });
  try {
    await file.makePublic();
  } catch (err) {
    await deleteVideoThumbnail(path);
    throw err;
  }
  return { path, url: `https://storage.googleapis.com/${bucket.name}/${path}` };
}

/** Best-effort removal of an uploaded thumbnail. Only paths under this business's prefix are touched. */
export async function deleteVideoThumbnail(path: string | undefined): Promise<void> {
  if (!path || !path.startsWith(prefix()) || path.includes("..")) return;
  try {
    await getBucket().file(path).delete({ ignoreNotFound: true });
  } catch (err) {
    logServerError("admin.video.thumbnail-cleanup", err, { path });
  }
}
