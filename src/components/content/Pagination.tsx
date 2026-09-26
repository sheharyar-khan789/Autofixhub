import Link from "next/link";

/** Previous/next pagination with plain ?page= links (crawlable, no client JS). */
export function Pagination({
  basePath,
  page,
  pageCount,
  params = {},
}: {
  basePath: string;
  page: number;
  pageCount: number;
  params?: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const cls =
    "inline-flex min-h-11 items-center rounded border border-border-medium px-space-md font-code text-body-sm text-text-primary hover:border-text-muted";
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center gap-space-sm">
      {page > 1 && (
        <Link href={href(page - 1)} rel="prev" className={cls}>
          Previous
        </Link>
      )}
      <span className="font-code text-body-sm text-text-muted" aria-current="page">
        Page {page} of {pageCount}
      </span>
      {page < pageCount && (
        <Link href={href(page + 1)} rel="next" className={cls}>
          Next
        </Link>
      )}
    </nav>
  );
}
