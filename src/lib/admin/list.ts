import { paginate, type Page } from "@/lib/content";
import { PUBLISH_STATUSES, type PublishStatus } from "@/lib/models";

/**
 * Admin table state (search, status filter, sort, page) parsed from GET parameters,
 * applied to an already-loaded, bounded list. Pure: unit-tested in knowledge tests.
 */
export interface ListQuery {
  q: string;
  status: PublishStatus | "all";
  sort: string;
  page: string | undefined;
}

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseListQuery(params: Params, sorts: readonly string[], defaultSort: string): ListQuery {
  const status = one(params.status);
  const sort = one(params.sort);
  return {
    q: (one(params.q) ?? "").trim().slice(0, 100),
    status: status && (PUBLISH_STATUSES as readonly string[]).includes(status) ? (status as PublishStatus) : "all",
    sort: sort && sorts.includes(sort) ? sort : defaultSort,
    page: one(params.page),
  };
}

export interface ListConfig<T> {
  /** Text searched by `q` (case-insensitive substring over every word). */
  text: (item: T) => string;
  sorters: Record<string, (a: T, b: T) => number>;
}

export const ADMIN_PAGE_SIZE = 20;

export function applyListQuery<T extends { status: PublishStatus }>(
  items: T[],
  query: ListQuery,
  cfg: ListConfig<T>,
  pageSize = ADMIN_PAGE_SIZE,
): Page<T> & { counts: Record<PublishStatus | "all", number> } {
  const words = query.q.toLowerCase().split(/\s+/).filter(Boolean);
  const matching = words.length ? items.filter((i) => words.every((w) => cfg.text(i).toLowerCase().includes(w))) : items;
  const counts = { all: matching.length, draft: 0, published: 0, archived: 0 };
  for (const i of matching) counts[i.status]++;
  const filtered = query.status === "all" ? matching : matching.filter((i) => i.status === query.status);
  const sorted = [...filtered].sort(cfg.sorters[query.sort] ?? (() => 0));
  return { ...paginate(sorted, query.page, pageSize), counts };
}

/** Build a list URL keeping the current filters (used for "back" links and pagination). */
export function listHref(base: string, query: Partial<ListQuery>, overrides: Partial<ListQuery> = {}): string {
  const merged = { ...query, ...overrides };
  const p = new URLSearchParams();
  if (merged.q) p.set("q", merged.q);
  if (merged.status && merged.status !== "all") p.set("status", merged.status);
  if (merged.sort) p.set("sort", merged.sort);
  if (merged.page && merged.page !== "1") p.set("page", merged.page);
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}

export const byUpdatedDesc = <T extends { updatedAt?: string }>(a: T, b: T) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
export const byText = <T>(get: (t: T) => string | undefined) => (a: T, b: T) =>
  (get(a) ?? "").localeCompare(get(b) ?? "", "en", { sensitivity: "base" });
