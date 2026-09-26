import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { getReviewAdmin } from "@/lib/admin/reviews";
import { PageHeader } from "../../../_components/ui";
import { ReviewForm } from "../ReviewForm";

export const dynamic = "force-dynamic";

export default async function EditReviewPage({ params }: PageProps<"/admin/reviews/[id]">) {
  await requireRole(CONTENT_ROLES);
  const { id } = await params;
  const review = await getReviewAdmin(id);
  if (!review) notFound();
  return (
    <div className="flex flex-col gap-space-lg">
      <PageHeader title={`Edit review: ${review.name}`} />
      <ReviewForm review={review} />
    </div>
  );
}
