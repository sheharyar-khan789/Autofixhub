import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { PageHeader } from "../../../_components/ui";
import { CategoryForm } from "../CategoryForm";

export default async function NewCategoryPage() {
  await requireRole(CONTENT_ROLES);
  return (
    <>
      <PageHeader title="New category" breadcrumbs={[{ name: "Dashboard", href: "/admin" }, { name: "Categories", href: "/admin/categories" }, { name: "New" }]} />
      <CategoryForm />
    </>
  );
}
