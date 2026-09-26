import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { getAdminById, listCategoriesAdmin, servicesConfig } from "@/lib/admin/content";
import { PageHeader } from "../../../_components/ui";
import { ServiceForm } from "../ServiceForm";

export const dynamic = "force-dynamic";

export default async function EditServicePage({ params }: PageProps<"/admin/services/[id]">) {
  await requireRole(CONTENT_ROLES);
  const { id } = await params;
  const [service, categories] = await Promise.all([getAdminById(servicesConfig, id), listCategoriesAdmin()]);
  if (!service) notFound();
  return (
    <div className="flex flex-col gap-space-lg">
      <PageHeader title={`Edit: ${service.name}`} />
      <ServiceForm service={service} categories={categories} />
    </div>
  );
}
