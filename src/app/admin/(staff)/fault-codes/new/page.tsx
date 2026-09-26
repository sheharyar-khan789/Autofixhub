import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { loadCategoryOptions } from "@/lib/admin/content";
import { PageHeader } from "../../../_components/ui";
import { FaultCodeForm } from "../FaultCodeForm";

export const dynamic = "force-dynamic";

export default async function NewFaultCodePage() {
  await requireRole(CONTENT_ROLES);
  const categories = await loadCategoryOptions();
  return (
    <>
      <PageHeader title="New fault code" breadcrumbs={[{ name: "Dashboard", href: "/admin" }, { name: "Fault codes", href: "/admin/fault-codes" }, { name: "New" }]} />
      <FaultCodeForm categories={categories} />
    </>
  );
}
