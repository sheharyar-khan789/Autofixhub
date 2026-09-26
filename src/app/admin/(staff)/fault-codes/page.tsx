import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { isNotConfigured } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import { faultCodesConfig, listAllAdmin } from "@/lib/admin/content";
import { applyListQuery, byText, byUpdatedDesc, listHref, parseListQuery } from "@/lib/admin/list";
import type { FaultCode } from "@/lib/models";
import { DeleteButton } from "../../_components/DeleteButton";
import { ListControls, TablePagination } from "../../_components/ListControls";
import { StatusToggle } from "../../_components/StatusToggle";
import {
  EmptyState, ErrorState, PageHeader, PublishBadge, primaryBtn, rowActionClass, tableWrapClass, tdClass, thClass, trClass,
} from "../../_components/ui";
import { deleteFaultCodeAction, setFaultCodeStatusAction } from "./actions";

export const dynamic = "force-dynamic";

const BASE = "/admin/fault-codes";
const SORTS = [
  { value: "code", label: "Code" },
  { value: "updated", label: "Recently updated" },
];

export default async function FaultCodesPage({ searchParams }: PageProps<"/admin/fault-codes">) {
  await requireRole(CONTENT_ROLES);
  const query = parseListQuery(await searchParams, SORTS.map((s) => s.value), "code");
  let codes: FaultCode[] = [];
  let failure: "not-configured" | "error" | null = null;
  try {
    codes = await listAllAdmin(faultCodesConfig);
  } catch (err) {
    failure = isNotConfigured(err) ? "not-configured" : "error";
    if (failure === "error") logServerError("admin.faultCodes.list", err);
  }
  const result = applyListQuery(codes, query, {
    text: (c) => [c.code, c.title, c.system, c.meaning, ...(c.relatedVehicles ?? [])].join(" "),
    sorters: { code: byText((c) => c.code), updated: byUpdatedDesc },
  });
  const back = listHref(BASE, query);

  return (
    <>
      <PageHeader
        title="Fault codes"
        description="Explanations of diagnostic trouble codes. Mark each as generic OBD-II or manufacturer-specific."
        breadcrumbs={[{ name: "Dashboard", href: "/admin" }, { name: "Fault codes" }]}
        action={<Link href="/admin/fault-codes/new" className={primaryBtn}>New fault code</Link>}
      />
      {failure === "not-configured" ? (
        <EmptyState title="Firebase isn't connected here">Fault codes can&apos;t be loaded in this environment.</EmptyState>
      ) : failure === "error" ? (
        <ErrorState retryHref={back}>Fault codes couldn&apos;t be loaded from the database. This is usually temporary.</ErrorState>
      ) : codes.length === 0 ? (
        <EmptyState title="No fault codes yet" action={<Link href="/admin/fault-codes/new" className={primaryBtn}>Add a fault code</Link>}>
          Run <code>npm run seed</code> to add three reviewed generic OBD-II codes as drafts, or add your own.
        </EmptyState>
      ) : (
        <>
          <ListControls base={BASE} query={query} counts={result.counts} sorts={SORTS} searchLabel="Search code, title or system" />
          {result.items.length === 0 ? (
            <EmptyState title="No matches">Nothing matches these filters. <Link href={BASE} className="underline">Clear filters</Link></EmptyState>
          ) : (
            <div className={tableWrapClass}>
              <table className="admin-table w-full min-w-[48rem] border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className={thClass}>Code</th>
                    <th scope="col" className={thClass}>Title</th>
                    <th scope="col" className={thClass}>System</th>
                    <th scope="col" className={thClass}>Scope</th>
                    <th scope="col" className={thClass}>Status</th>
                    <th scope="col" className={thClass}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((c) => (
                    <tr key={c.id} className={trClass}>
                      <td className={`${tdClass} font-code font-semibold`} data-label="Code">
                        <Link href={`/admin/fault-codes/${c.id}`} className="text-status-fault-red hover:underline">{c.code}</Link>
                      </td>
                      <td className={tdClass} data-label="Title">{c.title}</td>
                      <td className={`${tdClass} text-text-muted`} data-label="System">{c.system ?? "—"}</td>
                      <td className={`${tdClass} text-text-muted`} data-label="Scope">{c.scope === "generic" ? "Generic OBD-II" : "Manufacturer-specific"}</td>
                      <td className={tdClass} data-label="Status"><PublishBadge status={c.status} /></td>
                      <td className={tdClass}>
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <Link href={`/admin/fault-codes/${c.id}`} className={rowActionClass}>Edit</Link>
                          {c.status === "published" && (
                            <Link href={`/fault-codes/${c.code.toLowerCase()}`} target="_blank" className={rowActionClass}>
                              View<span className="sr-only"> (opens in a new tab)</span>
                            </Link>
                          )}
                          <StatusToggle action={setFaultCodeStatusAction} id={c.id} status={c.status} back={back} />
                          <DeleteButton action={deleteFaultCodeAction} id={c.id} confirmMessage={`${c.code} will be permanently deleted. This can't be undone.`} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <TablePagination base={BASE} query={query} page={result.page} pageCount={result.pageCount} total={result.total} />
        </>
      )}
    </>
  );
}
