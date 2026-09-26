import Image from "next/image";
import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { isNotConfigured } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import { listGalleryAdmin } from "@/lib/admin/gallery";
import { cardClass, EmptyState, inputClass, PageHeader } from "../../_components/ui";
import { DeleteButton } from "../../_components/DeleteButton";
import { GalleryUploadForm } from "./GalleryUploadForm";
import { CopyUrlButton } from "../../_components/CopyUrlButton";
import { deleteGalleryImageAction, updateGalleryImageAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  await requireRole(CONTENT_ROLES);
  let images: Awaited<ReturnType<typeof listGalleryAdmin>> = [];
  let unavailable = false;
  try {
    images = await listGalleryAdmin();
  } catch (err) {
    if (isNotConfigured(err)) unavailable = true;
    else logServerError("admin.gallery.list", err);
  }

  return (
    <div className="flex flex-col gap-space-lg">
      <PageHeader title="Media library" breadcrumbs={[{ name: "Dashboard", href: "/admin" }, { name: "Media" }]} />
      <p className="text-body-sm text-text-muted">
        Upload images (JPEG, PNG or WebP) for guides and videos, then use &ldquo;Copy URL&rdquo; and paste it into a
        guide&apos;s featured image or social share image. Uploaded files are publicly reachable by their URL.
      </p>
      <GalleryUploadForm />

      {unavailable ? (
        <EmptyState>Firebase Admin is not configured in this environment.</EmptyState>
      ) : images.length === 0 ? (
        <EmptyState>No photos uploaded yet.</EmptyState>
      ) : (
        <div className="grid gap-space-lg sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <div key={img.id} className={`${cardClass} flex flex-col gap-space-sm`}>
              <div className="relative aspect-video w-full overflow-hidden rounded bg-surface-elevated">
                <Image src={img.url} alt={img.caption ?? ""} fill sizes="360px" className="object-cover" unoptimized />
              </div>
              <form action={updateGalleryImageAction} className="flex flex-col gap-space-sm">
                <input type="hidden" name="id" value={img.id} />
                <input name="caption" defaultValue={img.caption} placeholder="Caption" className={inputClass} />
                <input name="category" defaultValue={img.category} placeholder="Category" className={inputClass} />
                <div className="flex items-center gap-space-sm">
                  <input name="order" type="number" defaultValue={img.order} className={`${inputClass} w-20`} />
                  <select name="status" defaultValue={img.status} className={inputClass}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="flex items-center gap-space-md">
                  <button type="submit" className="text-body-sm text-text-primary hover:underline">Save</button>
                  <CopyUrlButton url={img.url} label="Copy URL" />
                  <DeleteButton
                    action={deleteGalleryImageAction}
                    id={img.id}
                    confirmMessage="Delete this image? Any guide still using its URL will show a broken image."
                  />
                </div>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
