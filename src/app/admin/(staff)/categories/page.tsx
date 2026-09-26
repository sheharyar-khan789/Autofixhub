import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { isNotConfigured } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import { categoriesConfig, faultCodesConfig, guidesConfig, listAllAdmin, videosConfig } from "@/lib/admin/content";
import { itemsInCategory } from "@/lib/content";
import { applyListQuery, byText, listHref, parseListQuery } from "@/lib/admin/list";
import type { ContentCategory } from "@/lib/models";
import { DeleteButton } from "../../_components/DeleteButton";
import { ListControls, TablePagination } from "../../_components/ListControls";
import { StatusToggle } from "../../_components/StatusToggle";
import {
  EmptyState, ErrorState, PageHeader, PublishBadge, primaryBtn, rowActionClass, tableWrapClass, tdClass, thClass, trClass,
} from "../../_components/ui";
import { deleteCategoryAction, setCategoryStatusAction } from "./actions";

export const dynamic = "force-dynamic";

const BASE = "/admin/categories";
const SORTS = [
  { value: "order", label: "Display order" },
  { value: "name", label: "Name A–Z" },
];

export default async function CategoriesAdminPage({ searchParams }: PageProps<"/admin/categories">) {
  await requireRole(CONTENT_ROLES);
  const query = parseListQuery(await searchParams, SORTS.map((s) => s.value), "order");
  let categories: ContentCategory[] = [];
  let counts = new Map<string, number>();
  let failure: "not-configured" | "error" | null = null;
  try {
    const [cats, guides, faultCodes, videos] = await Promise.all([
      listAllAdmin(categoriesConfig),
      listAllAdmin(guidesConfig),
      listAllAdmin(faultCodesConfig),
      listAllAdmin(videosConfig),
    ]);
    categories = cats;
    // Published content only: that is what decides whether the public category page exists.
    const pub = <T extends { status: string }>(xs: T[]) => xs.filter((x) => x.status === "published");
    const published = { guides: pub(guides), faultCodes: pub(faultCodes), videos: pub(videos) };
    counts = new Map(cats.map((c) => {
      const i = itemsInCategory(c.slug, published);
      return [c.slug, i.guides.length + i.faultCodes.length + i.videos.length];
    }));
  } catch (err) {
    failure = isNotConfigured(err) ? "not-configured" : "error";
    if (failure === "error") logServerError("admin.categories.list", err);
  }
  const result = applyListQuery(categories, query, {
    text: (c) => [c.name, c.slug, c.kind, c.description].join(" "),
    sorters: { order: (a, b) => a.kind.localeCompare(b.kind) || a.order - b.order, name: byText((c) => c.name) },
  });
  const back = listHref(BASE, query);

  return (
    <>
      <PageHeader
        title="Categories"
        description="Vehicle groups and topics used to organise content. A category page goes live only when it is published and has published content."
        breadcrumbs={[{ name: "Dashboard", href: "/admin" }, { name: "Categories" }]}
        action={<Link href="/admin/categories/new" className={primaryBtn}>New category</Link>}
      />
      {failure === "not-configured" ? (
        <EmptyState title="Firebase isn't connected here">Categories can&apos;t be loaded in this environment.</EmptyState>
      ) : failure === "error" ? (
        <ErrorState retryHref={back}>Categories couldn&apos;t be loaded from the database. This is usually temporary.</ErrorState>
      ) : categories.length === 0 ? (
        <EmptyState title="No categories yet" action={<Link href="/admin/categories/new" className={primaryBtn}>Create a category</Link>}>
          Run <code>npm run seed</code> to create the starter set (Volkswagen Group, Toyota, Diesel, Hybrid, DPF, Turbo …).
        </EmptyState>
      ) : (
        <>
          <ListControls base={BASE} query={query} counts={result.counts} sorts={SORTS} searchLabel="Search categories" />
          {result.items.length === 0 ? (
            <EmptyState title="No matches">Nothing matches these filters. <Link href={BASE} className="underline">Clear filters</Link></EmptyState>
          ) : (
            <div className={tableWrapClass}>
              <table className="admin-table w-full min-w-[44rem] border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className={thClass}>Name</th>
                    <th scope="col" className={thClass}>Type</th>
                    <th scope="col" className={thClass}>Published content</th>
                    <th scope="col" className={thClass}>Status</th>
                    <th scope="col" className={thClass}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((c) => {
                    const n = counts.get(c.slug) ?? 0;
                    const live = c.status === "published" && n > 0;
                    return (
                      <tr key={c.id} className={trClass}>
                        <td className={tdClass} data-label="Name">
                          <Link href={`/admin/categories/${c.id}`} className="font-semibold text-text-primary hover:underline">{c.name}</Link>
                          <div className="font-code text-label-telemetry text-text-muted">/categories/{c.slug}</div>
                        </td>
                        <td className={`${tdClass} capitalize text-text-muted`} data-label="Type">{c.kind}</td>
                        <td className={tdClass} data-label="Published content">
                          <span className="tabular-nums">{n}</span>{" "}
                          <span className={`font-code text-label-telemetry ${live ? "text-status-pass-green" : "text-text-muted"}`}>
                            {live ? "· page live" : "· not public yet"}
                          </span>
                        </td>
                        <td className={tdClass} data-label="Status"><PublishBadge status={c.status} /></td>
                        <td className={tdClass}>
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <Link href={`/admin/categories/${c.id}`} className={rowActionClass}>Edit</Link>
                            {live && (
                              <Link href={`/categories/${c.slug}`} target="_blank" className={rowActionClass}>
                                View<span className="sr-only"> (opens in a new tab)</span>
                              </Link>
                            )}
                            <StatusToggle action={setCategoryStatusAction} id={c.id} status={c.status} back={back} />
                            <DeleteButton
                              action={deleteCategoryAction}
                              id={c.id}
                              confirmMessage={`"${c.name}" will be deleted. Content tagged with it keeps the tag, but it will no longer link anywhere.`}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
