import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { loadCategoryOptions } from "@/lib/admin/content";
import { PageHeader } from "../../../_components/ui";
import { VideoForm } from "../VideoForm";

export const dynamic = "force-dynamic";

export default async function NewVideoPage() {
  await requireRole(CONTENT_ROLES);
  const categories = await loadCategoryOptions();
  return (
    <>
      <PageHeader title="New video" breadcrumbs={[{ name: "Dashboard", href: "/admin" }, { name: "Videos", href: "/admin/videos" }, { name: "New" }]} />
      <VideoForm categories={categories} />
    </>
  );
}
