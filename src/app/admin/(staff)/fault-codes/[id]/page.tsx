import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { faultCodesConfig, getAdminById, loadCategoryOptions } from "@/lib/admin/content";
import { DeleteButton } from "../../../_components/DeleteButton";
import { PageHeader } from "../../../_components/ui";
import { deleteFaultCodeAction } from "../actions";
import { FaultCodeForm } from "../FaultCodeForm";

export const dynamic = "force-dynamic";

export default async function EditFaultCodePage({ params }: PageProps<"/admin/fault-codes/[id]">) {
  await requireRole(CONTENT_ROLES);
  const { id } = await params;
  const [faultCode, categories] = await Promise.all([getAdminById(faultCodesConfig, id), loadCategoryOptions()]);
  if (!faultCode) notFound();
  return (
    <>
      <PageHeader
        title={faultCode.code}
        breadcrumbs={[{ name: "Dashboard", href: "/admin" }, { name: "Fault codes", href: "/admin/fault-codes" }, { name: "Edit" }]}
        action={
          <DeleteButton
            variant="button"
            action={deleteFaultCodeAction}
            id={faultCode.id}
            redirectTo="/admin/fault-codes"
            confirmMessage="This will be permanently deleted and removed from the website. This can't be undone."
          />
        }
      />
      <FaultCodeForm faultCode={faultCode} categories={categories} />
    </>
  );
}
