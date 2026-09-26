import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { isNotConfigured } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import { listReviewsAdmin } from "@/lib/admin/reviews";
import { EmptyState, PageHeader, PublishBadge, secondaryBtn, tableWrapClass, tdClass, thClass, trClass } from "../../_components/ui";
import { DeleteButton } from "../../_components/DeleteButton";
import { deleteReviewAction, setReviewStatusFormAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  await requireRole(CONTENT_ROLES);
  let reviews: Awaited<ReturnType<typeof listReviewsAdmin>> = [];
  let unavailable = false;
  try {
    reviews = await listReviewsAdmin();
  } catch (err) {
    if (isNotConfigured(err)) unavailable = true;
    else logServerError("admin.reviews.list", err);
  }

  return (
    <div className="flex flex-col gap-space-lg">
      <PageHeader title="Reviews" action={<Link href="/admin/reviews/new" className={secondaryBtn}>New review</Link>} />
      <p className="text-body-sm text-text-muted">
        Enter reviews the workshop has actually received elsewhere (Google, Facebook, in person). Nothing here is generated automatically.
      </p>

      {unavailable ? (
        <EmptyState>Firebase Admin is not configured in this environment.</EmptyState>
      ) : reviews.length === 0 ? (
        <EmptyState>No reviews yet.</EmptyState>
      ) : (
        <div className={tableWrapClass}>
          <table className="w-full min-w-[40rem] border-collapse">
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Rating</th>
                <th className={thClass}>Source</th>
                <th className={thClass}>Date</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} className={trClass}>
                  <td className={tdClass}>
                    <Link href={`/admin/reviews/${r.id}`} className="font-semibold text-text-primary hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td className={tdClass}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</td>
                  <td className={`${tdClass} text-text-muted`}>{r.source}</td>
                  <td className={`${tdClass} text-text-muted`}>{r.date}</td>
                  <td className={tdClass}>
                    <PublishBadge status={r.status} />
                  </td>
                  <td className={tdClass}>
                    <div className="flex flex-wrap gap-space-xs">
                      {r.status === "published" ? (
                        <form action={setReviewStatusFormAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value="draft" />
                          <button type="submit" className="text-body-sm text-text-muted hover:text-text-primary">Unpublish</button>
                        </form>
                      ) : (
                        <form action={setReviewStatusFormAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value="published" />
                          <button type="submit" className="text-body-sm text-status-pass-green hover:underline">Publish</button>
                        </form>
                      )}
                      <DeleteButton action={deleteReviewAction} id={r.id} confirmMessage={`Delete the review from ${r.name}?`} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
