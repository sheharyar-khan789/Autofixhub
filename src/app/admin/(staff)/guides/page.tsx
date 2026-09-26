import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { isNotConfigured, siteUrl } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import { guidesConfig, listAllAdmin, loadCategoryOptions } from "@/lib/admin/content";
import { applyListQuery, byText, byUpdatedDesc, listHref, parseListQuery } from "@/lib/admin/list";
import type { Guide } from "@/lib/models";
import { CopyUrlButton } from "../../_components/CopyUrlButton";
import { DeleteButton } from "../../_components/DeleteButton";
import { ListControls, TablePagination } from "../../_components/ListControls";
import { StatusToggle } from "../../_components/StatusToggle";
import {
  EmptyState, ErrorState, PageHeader, PublishBadge, primaryBtn, rowActionClass, tableWrapClass, tdClass, thClass, trClass,
} from "../../_components/ui";
import { deleteGuideAction, setGuideStatusAction } from "./actions";

export const dynamic = "force-dynamic";

const BASE = "/admin/guides";
const SORTS = [
  { value: "updated", label: "Recently updated" },
  { value: "title", label: "Title A–Z" },
  { value: "published", label: "Recently published" },
];

export default async function GuidesPage({ searchParams }: PageProps<"/admin/guides">) {
  await requireRole(CONTENT_ROLES);
  const query = parseListQuery(await searchParams, SORTS.map((s) => s.value), "updated");
  let guides: Guide[] = [];
  let failure: "not-configured" | "error" | null = null;
  try {
    guides = await listAllAdmin(guidesConfig);
  } catch (err) {
    failure = isNotConfigured(err) ? "not-configured" : "error";
    if (failure === "error") logServerError("admin.guides.list", err);
  }
  const categories = new Map((await loadCategoryOptions()).map((c) => [c.slug, c.name]));
  const result = applyListQuery(guides, query, {
    text: (g) => [g.title, g.slug, g.vehicleMake, g.vehicleModel, g.problemCategory, ...(g.relatedFaultCodes ?? [])].join(" "),
    sorters: {
      updated: byUpdatedDesc,
      title: byText((g) => g.title),
      published: (a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
    },
  });
  const base = siteUrl();
  const back = listHref(BASE, query);

  return (
    <>
      <PageHeader
        title="Repair guides"
        description="Write and publish repair guides. Only published guides appear on the website and in the sitemap."
        breadcrumbs={[{ name: "Dashboard", href: "/admin" }, { name: "Guides" }]}
        action={<Link href="/admin/guides/new" className={primaryBtn}>New guide</Link>}
      />

      {failure === "not-configured" ? (
        <EmptyState title="Firebase isn't connected here">Guides can&apos;t be loaded in this environment.</EmptyState>
      ) : failure === "error" ? (
        <ErrorState retryHref={back}>Guides couldn&apos;t be loaded from the database. This is usually temporary.</ErrorState>
      ) : guides.length === 0 ? (
        <EmptyState title="No guides yet" action={<Link href="/admin/guides/new" className={primaryBtn}>Write the first guide</Link>}>
          Start with a problem you have fixed and filmed: symptoms, likely causes, how you diagnosed it, and the YouTube link.
        </EmptyState>
      ) : (
        <>
          <ListControls base={BASE} query={query} counts={result.counts} sorts={SORTS} searchLabel="Search title, vehicle, system or fault code" />
          {result.items.length === 0 ? (
            <EmptyState title="No matches">Nothing matches these filters. <Link href={BASE} className="underline">Clear filters</Link></EmptyState>
          ) : (
            <div className={tableWrapClass}>
              <table className="admin-table w-full min-w-[52rem] border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className={thClass}>Title</th>
                    <th scope="col" className={thClass}>Vehicle</th>
                    <th scope="col" className={thClass}>Category</th>
                    <th scope="col" className={thClass}>Status</th>
                    <th scope="col" className={thClass}>Updated</th>
                    <th scope="col" className={thClass}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((g) => (
                    <tr key={g.id} className={trClass}>
                      <td className={tdClass} data-label="Title">
                        <Link href={`/admin/guides/${g.id}`} className="font-semibold text-text-primary hover:underline">
                          {g.title}
                        </Link>
                        <div className="font-code text-label-telemetry text-text-muted">/guides/{g.slug}</div>
                      </td>
                      <td className={tdClass} data-label="Vehicle">{[g.vehicleMake, g.vehicleModel].filter(Boolean).join(" ") || "—"}</td>
                      <td className={tdClass} data-label="Category">
                        {(g.categorySlugs ?? []).map((s) => categories.get(s) ?? s).join(", ") || g.problemCategory || "—"}
                      </td>
                      <td className={tdClass} data-label="Status"><PublishBadge status={g.status} /></td>
                      <td className={`${tdClass} whitespace-nowrap text-text-muted`} data-label="Updated">
                        {g.updatedAt ? new Date(g.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className={tdClass}>
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <Link href={`/admin/guides/${g.id}`} className={rowActionClass}>Edit</Link>
                          {g.status === "published" && (
                            <>
                              <Link href={`/guides/${g.slug}`} target="_blank" className={rowActionClass}>
                                View<span className="sr-only"> (opens in a new tab)</span>
                              </Link>
                              <CopyUrlButton url={`${base}/guides/${g.slug}`} label="Copy URL" />
                            </>
                          )}
                          <StatusToggle action={setGuideStatusAction} id={g.id} status={g.status} back={back} />
                          <DeleteButton action={deleteGuideAction} id={g.id} confirmMessage={`"${g.title}" will be permanently deleted. This can't be undone.`} />
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
