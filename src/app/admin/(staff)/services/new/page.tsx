import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { listCategoriesAdmin } from "@/lib/admin/content";
import { PageHeader } from "../../../_components/ui";
import { ServiceForm } from "../ServiceForm";

export default async function NewServicePage() {
  await requireRole(CONTENT_ROLES);
  const categories = await listCategoriesAdmin();
  return (
    <div className="flex flex-col gap-space-lg">
      <PageHeader title="New service" />
      <ServiceForm categories={categories} />
    </div>
  );
}
