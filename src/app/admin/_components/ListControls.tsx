import { Search } from "lucide-react";
import Link from "next/link";
import type { PublishStatus } from "@/lib/models";
import { listHref, type ListQuery } from "@/lib/admin/list";
import { inputClass, secondaryBtn } from "./ui";

const STATUS_TABS: { value: PublishStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
  { value: "archived", label: "Archived" },
];

/**
 * Search + status tabs + sort for an admin table. A plain GET form: works without
 * JavaScript, keeps state in the URL (shareable, back button friendly).
 */
export function ListControls({
  base,
  query,
  counts,
  sorts,
  searchLabel,
}: {
  base: string;
  query: ListQuery;
  counts: Record<PublishStatus | "all", number>;
  sorts: { value: string; label: string }[];
  searchLabel: string;
}) {
  return (
    <div className="flex flex-col gap-space-md">
      <nav aria-label="Filter by status" className="-mx-gutter flex gap-1 overflow-x-auto border-b border-border-subtle px-gutter sm:mx-0 sm:px-0">
        {STATUS_TABS.map((t) => {
          const active = query.status === t.value;
          return (
            <Link
              key={t.value}
              href={listHref(base, query, { status: t.value, page: undefined })}
              aria-current={active ? "page" : undefined}
              className={`-mb-px inline-flex min-h-10 shrink-0 items-center gap-space-xs border-b-2 px-space-md text-body-sm transition-colors ${
                active ? "border-primary-container font-semibold text-text-primary" : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              {t.label}
              <span className="rounded-full bg-surface-card px-1.5 font-code text-label-badge text-text-muted tabular-nums">{counts[t.value]}</span>
            </Link>
          );
        })}
      </nav>
      <form action={base} method="GET" role="search" className="flex flex-col gap-space-sm sm:flex-row sm:items-end">
        {query.status !== "all" && <input type="hidden" name="status" value={query.status} />}
        <label className="flex flex-1 flex-col gap-space-xs">
          <span className="sr-only">{searchLabel}</span>
          <span className="relative">
            <Search className="pointer-events-none absolute left-space-md top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
            <input name="q" type="search" defaultValue={query.q} placeholder={searchLabel} className={`${inputClass} pl-10`} />
          </span>
        </label>
        <label className="flex flex-col gap-space-xs text-body-sm text-text-muted sm:w-48">
          <span className="sr-only">Sort by</span>
          <select name="sort" defaultValue={query.sort} className={inputClass} aria-label="Sort by">
            {sorts.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <div className="flex gap-space-sm">
          <button type="submit" className={secondaryBtn}>Apply</button>
          {(query.q || query.status !== "all") && (
            <Link href={base} className={`${secondaryBtn} border-transparent bg-transparent`}>Reset</Link>
          )}
        </div>
      </form>
    </div>
  );
}

export function TablePagination({ base, query, page, pageCount, total }: { base: string; query: ListQuery; page: number; pageCount: number; total: number }) {
  if (pageCount <= 1) return <p className="font-code text-label-telemetry text-text-muted">{total} {total === 1 ? "item" : "items"}</p>;
  const cls = "inline-flex min-h-10 items-center rounded-md border border-border-medium px-space-md text-body-sm text-text-primary hover:border-text-muted";
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-space-sm">
      <p className="font-code text-label-telemetry text-text-muted">
        Page {page} of {pageCount} · {total} items
      </p>
      <div className="flex gap-space-sm">
        {page > 1 && <Link rel="prev" className={cls} href={listHref(base, query, { page: String(page - 1) })}>Previous</Link>}
        {page < pageCount && <Link rel="next" className={cls} href={listHref(base, query, { page: String(page + 1) })}>Next</Link>}
      </div>
    </nav>
  );
}
