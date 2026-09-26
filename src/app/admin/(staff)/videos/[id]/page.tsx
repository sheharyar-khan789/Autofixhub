import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { getAdminById, guidesConfig, listAllAdmin, loadCategoryOptions, videosConfig } from "@/lib/admin/content";
import { siteUrl } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import { DeleteButton } from "../../../_components/DeleteButton";
import { PageHeader } from "../../../_components/ui";
import { deleteVideoAction } from "../actions";
import { VideoForm } from "../VideoForm";

export const dynamic = "force-dynamic";

export default async function EditVideoPage({ params }: PageProps<"/admin/videos/[id]">) {
  await requireRole(CONTENT_ROLES);
  const { id } = await params;
  const [video, categories] = await Promise.all([getAdminById(videosConfig, id), loadCategoryOptions()]);
  if (!video) notFound();
  // Only offer the guide link once that guide is actually published (otherwise it would 404).
  let guideUrl: string | undefined;
  if (video.relatedGuideSlug) {
    try {
      const guide = (await listAllAdmin(guidesConfig)).find((g) => g.slug === video.relatedGuideSlug);
      if (guide?.status === "published") guideUrl = `${siteUrl()}/guides/${guide.slug}`;
    } catch (err) {
      logServerError("admin.video.related-guide", err, { id });
    }
  }
  return (
    <>
      <PageHeader
        title={video.title}
        breadcrumbs={[{ name: "Dashboard", href: "/admin" }, { name: "Videos", href: "/admin/videos" }, { name: "Edit" }]}
        action={
          <DeleteButton
            variant="button"
            action={deleteVideoAction}
            id={video.id}
            redirectTo="/admin/videos"
            confirmMessage="This will be permanently deleted and removed from the website. This can't be undone."
          />
        }
      />
      <VideoForm video={video} categories={categories} guideUrl={guideUrl} />
    </>
  );
}
