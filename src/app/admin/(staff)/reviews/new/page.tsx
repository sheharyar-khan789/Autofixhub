import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { PageHeader } from "../../../_components/ui";
import { ReviewForm } from "../ReviewForm";

export default async function NewReviewPage() {
  await requireRole(CONTENT_ROLES);
  return (
    <div className="flex flex-col gap-space-lg">
      <PageHeader title="New review" />
      <ReviewForm />
    </div>
  );
}
