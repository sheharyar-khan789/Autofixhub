import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { getAdminById, guidesConfig, loadCategoryOptions } from "@/lib/admin/content";
import { siteUrl } from "@/lib/env";
import { DeleteButton } from "../../../_components/DeleteButton";
import { PageHeader } from "../../../_components/ui";
import { deleteGuideAction } from "../actions";
import { GuideForm } from "../GuideForm";

export const dynamic = "force-dynamic";

export default async function EditGuidePage({ params }: PageProps<"/admin/guides/[id]">) {
  await requireRole(CONTENT_ROLES);
  const { id } = await params;
  const [guide, categories] = await Promise.all([getAdminById(guidesConfig, id), loadCategoryOptions()]);
  if (!guide) notFound();
  return (
    <>
      <PageHeader
        title={guide.title}
        breadcrumbs={[{ name: "Dashboard", href: "/admin" }, { name: "Guides", href: "/admin/guides" }, { name: "Edit" }]}
        action={
          <DeleteButton
            variant="button"
            action={deleteGuideAction}
            id={guide.id}
            redirectTo="/admin/guides"
            confirmMessage="This will be permanently deleted and removed from the website. This can't be undone."
          />
        }
      />
      <GuideForm
        guide={guide}
        categories={categories}
        publicUrl={guide.status === "published" ? `${siteUrl()}/guides/${guide.slug}` : undefined}
      />
    </>
  );
}
