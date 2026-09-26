import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { isNotConfigured } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import { listAllAdmin, loadCategoryOptions, videosConfig } from "@/lib/admin/content";
import { applyListQuery, byText, byUpdatedDesc, listHref, parseListQuery } from "@/lib/admin/list";
import type { Video } from "@/lib/models";
import { DeleteButton } from "../../_components/DeleteButton";
import { ListControls, TablePagination } from "../../_components/ListControls";
import { StatusToggle } from "../../_components/StatusToggle";
import {
  EmptyState, ErrorState, PageHeader, PublishBadge, primaryBtn, rowActionClass, tableWrapClass, tdClass, thClass, trClass,
} from "../../_components/ui";
import { deleteVideoAction, setVideoStatusAction } from "./actions";

export const dynamic = "force-dynamic";

const BASE = "/admin/videos";
const SORTS = [
  { value: "updated", label: "Recently updated" },
  { value: "title", label: "Title A–Z" },
  { value: "uploaded", label: "YouTube upload date" },
];

export default async function VideosPage({ searchParams }: PageProps<"/admin/videos">) {
  await requireRole(CONTENT_ROLES);
  const query = parseListQuery(await searchParams, SORTS.map((s) => s.value), "updated");
  let videos: Video[] = [];
  let failure: "not-configured" | "error" | null = null;
  try {
    videos = await listAllAdmin(videosConfig);
  } catch (err) {
    failure = isNotConfigured(err) ? "not-configured" : "error";
    if (failure === "error") logServerError("admin.videos.list", err);
  }
  const categories = new Map((await loadCategoryOptions()).map((c) => [c.slug, c.name]));
  const result = applyListQuery(videos, query, {
    text: (v) => [v.title, v.slug, v.youtubeVideoId, v.vehicleMake, v.vehicleModel, v.category, v.relatedGuideSlug].join(" "),
    sorters: {
      updated: byUpdatedDesc,
      title: byText((v) => v.title),
      uploaded: (a, b) => (b.uploadDate ?? "").localeCompare(a.uploadDate ?? ""),
    },
  });
  const back = listHref(BASE, query);

  return (
    <>
      <PageHeader
        title="Videos"
        description="Link YouTube videos to guides, fault codes and categories. Videos stay hosted on YouTube."
        breadcrumbs={[{ name: "Dashboard", href: "/admin" }, { name: "Videos" }]}
        action={<Link href="/admin/videos/new" className={primaryBtn}>Add video</Link>}
      />
      {failure === "not-configured" ? (
        <EmptyState title="Firebase isn't connected here">Videos can&apos;t be loaded in this environment.</EmptyState>
      ) : failure === "error" ? (
        <ErrorState retryHref={back}>Videos couldn&apos;t be loaded from the database. This is usually temporary.</ErrorState>
      ) : videos.length === 0 ? (
        <EmptyState title="No videos yet" action={<Link href="/admin/videos/new" className={primaryBtn}>Add a YouTube video</Link>}>
          Paste a YouTube link, then connect it to the guide it explains.
        </EmptyState>
      ) : (
        <>
          <ListControls base={BASE} query={query} counts={result.counts} sorts={SORTS} searchLabel="Search title, vehicle or YouTube ID" />
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
                    <th scope="col" className={thClass}>Guide</th>
                    <th scope="col" className={thClass}>Status</th>
                    <th scope="col" className={thClass}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((v) => (
                    <tr key={v.id} className={trClass}>
                      <td className={tdClass} data-label="Title">
                        <Link href={`/admin/videos/${v.id}`} className="font-semibold text-text-primary hover:underline">{v.title}</Link>
                        <div className="font-code text-label-telemetry text-text-muted">youtube: {v.youtubeVideoId}</div>
                      </td>
                      <td className={tdClass} data-label="Vehicle">{[v.vehicleMake, v.vehicleModel].filter(Boolean).join(" ") || "—"}</td>
                      <td className={tdClass} data-label="Category">
                        {(v.categorySlugs ?? []).map((s) => categories.get(s) ?? s).join(", ") || v.category || "—"}
                      </td>
                      <td className={`${tdClass} font-code text-label-telemetry`} data-label="Guide">{v.relatedGuideSlug ?? "—"}</td>
                      <td className={tdClass} data-label="Status"><PublishBadge status={v.status} /></td>
                      <td className={tdClass}>
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <Link href={`/admin/videos/${v.id}`} className={rowActionClass}>Edit</Link>
                          <a href={v.youtubeUrl} target="_blank" rel="noopener noreferrer" className={rowActionClass}>
                            YouTube<span className="sr-only"> (opens in a new tab)</span>
                          </a>
                          <StatusToggle action={setVideoStatusAction} id={v.id} status={v.status} back={back} />
                          <DeleteButton action={deleteVideoAction} id={v.id} confirmMessage={`"${v.title}" will be removed from the website. The video stays on YouTube.`} />
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
