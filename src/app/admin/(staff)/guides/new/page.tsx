import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { loadCategoryOptions } from "@/lib/admin/content";
import { PageHeader } from "../../../_components/ui";
import { GuideForm } from "../GuideForm";

export const dynamic = "force-dynamic";

export default async function NewGuidePage() {
  await requireRole(CONTENT_ROLES);
  const categories = await loadCategoryOptions();
  return (
    <>
      <PageHeader title="New guide" breadcrumbs={[{ name: "Dashboard", href: "/admin" }, { name: "Guides", href: "/admin/guides" }, { name: "New" }]} />
      <GuideForm categories={categories} />
    </>
  );
}
