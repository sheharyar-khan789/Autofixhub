import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { categoriesConfig, getAdminById } from "@/lib/admin/content";
import { DeleteButton } from "../../../_components/DeleteButton";
import { PageHeader } from "../../../_components/ui";
import { deleteCategoryAction } from "../actions";
import { CategoryForm } from "../CategoryForm";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({ params }: PageProps<"/admin/categories/[id]">) {
  await requireRole(CONTENT_ROLES);
  const { id } = await params;
  const category = await getAdminById(categoriesConfig, id);
  if (!category) notFound();
  return (
    <>
      <PageHeader
        title={category.name}
        breadcrumbs={[{ name: "Dashboard", href: "/admin" }, { name: "Categories", href: "/admin/categories" }, { name: "Edit" }]}
        action={
          <DeleteButton
            variant="button"
            action={deleteCategoryAction}
            id={category.id}
            redirectTo="/admin/categories"
            confirmMessage="This will be permanently deleted and removed from the website. This can't be undone."
          />
        }
      />
      <CategoryForm category={category} />
    </>
  );
}
