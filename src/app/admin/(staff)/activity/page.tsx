import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { SETTINGS_ROLES } from "@/lib/auth/permissions";
import { isNotConfigured } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import { listAuditLogPage } from "@/lib/admin/audit";
import type { AuditLogEntry } from "@/lib/models";
import { auditLine } from "../../_components/activity";
import { EmptyState, ErrorState, PageHeader, secondaryBtn, tableWrapClass, tdClass, thClass, trClass } from "../../_components/ui";

export const dynamic = "force-dynamic";

/** Audit log of every admin mutation (owners/managers only). Cursor-paginated, newest first. */
export default async function ActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  await requireRole(SETTINGS_ROLES);
  const { before } = await searchParams;
  const cursor = typeof before === "string" ? before : undefined;
  let entries: AuditLogEntry[] = [];
  let nextBefore: string | null = null;
  let failure: "not-configured" | "error" | null = null;
  try {
    ({ entries, nextBefore } = await listAuditLogPage(25, cursor));
  } catch (err) {
    failure = isNotConfigured(err) ? "not-configured" : "error";
    if (failure === "error") logServerError("admin.activity.list", err);
  }

  return (
    <>
      <PageHeader
        title="Activity"
        description="Every create, edit, publish, unpublish and delete made in the admin, with who did it."
        breadcrumbs={[{ name: "Dashboard", href: "/admin" }, { name: "Activity" }]}
      />
      {failure === "not-configured" ? (
        <EmptyState title="Firebase isn't connected here">The audit log can&apos;t be loaded in this environment.</EmptyState>
      ) : failure === "error" ? (
        <ErrorState retryHref="/admin/activity">The audit log couldn&apos;t be loaded. This is usually temporary.</ErrorState>
      ) : entries.length === 0 ? (
        <EmptyState title={cursor ? "No older activity" : "No activity yet"}>
          {cursor ? <Link href="/admin/activity" className="underline">Back to the newest entries</Link> : "Changes made in the admin will be recorded here."}
        </EmptyState>
      ) : (
        <>
          <div className={tableWrapClass}>
            <table className="admin-table w-full min-w-[40rem] border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={thClass}>When</th>
                  <th scope="col" className={thClass}>What</th>
                  <th scope="col" className={thClass}>Item</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className={trClass}>
                    <td className={`${tdClass} whitespace-nowrap font-code text-label-telemetry text-text-muted`} data-label="When">
                      <time dateTime={e.at}>{new Date(e.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time>
                    </td>
                    <td className={tdClass} data-label="What">{auditLine(e)}</td>
                    <td className={`${tdClass} font-code text-label-telemetry text-text-muted`} data-label="Item">
                      {e.targetType} · {e.targetId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav aria-label="Pagination" className="flex gap-space-sm">
            {cursor && <Link href="/admin/activity" className={secondaryBtn}>Newest</Link>}
            {nextBefore && <Link href={`/admin/activity?before=${encodeURIComponent(nextBefore)}`} className={secondaryBtn}>Older</Link>}
          </nav>
        </>
      )}
    </>
  );
}
