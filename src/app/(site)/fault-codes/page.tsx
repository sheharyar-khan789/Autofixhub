import type { Metadata } from "next";
import { FaultCodeCard } from "@/components/content/FaultCodeCard";
import { faultCodesNotice } from "@/components/content/ContentState";
import { Pagination } from "@/components/content/Pagination";
import { StateNotice } from "@/components/ui/Section";
import { paginate } from "@/lib/content";
import { getFaultCodes } from "@/lib/data";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Fault Code Database",
  description:
    "Look up OBD-II fault codes by code, vehicle or symptom: what they mean, likely causes and the diagnostic steps a technician would run.",
  alternates: { canonical: "/fault-codes" },
};

function matches(haystack: (string | undefined)[], q: string) {
  const needle = q.toLowerCase();
  return haystack.some((h) => h?.toLowerCase().includes(needle));
}

export default async function FaultCodesPage({ searchParams }: PageProps<"/fault-codes">) {
  const { q, page: rawPage } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const result = await getFaultCodes();
  const notice = faultCodesNotice(result);

  const codes = result.ok ? result.value : [];
  const filtered = query
    ? codes.filter((c) =>
        matches(
          [c.code, c.title, c.meaning, c.system, ...(c.relatedVehicles ?? []), ...(c.symptoms ?? [])],
          query,
        ),
      )
    : codes;
  const page = paginate(filtered, rawPage);

  return (
    <div className="px-gutter py-space-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-space-xl">
        <header className="flex max-w-3xl flex-col gap-space-sm">
          <h1 className="font-headline text-headline-xl-mobile text-text-primary md:text-headline-xl">Fault code database</h1>
          <p className="text-body-lg text-text-muted">
            Search by fault code, vehicle, symptom or keyword. A fault code is a diagnostic starting point: it shows which
            system logged a problem, not which part has failed. Generic codes are marked as such, because the same code can
            have a different likely cause depending on the vehicle.
          </p>
          <form action="/fault-codes" method="GET" role="search" className="flex w-full max-w-xl gap-space-sm">
            <label htmlFor="fault-code-search" className="sr-only">
              Search fault codes
            </label>
            <input
              id="fault-code-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="e.g. P0420, misfire, EGR…"
              className="w-full rounded border border-border-medium bg-surface-card px-space-md py-space-sm text-body-md text-text-primary placeholder:text-text-muted focus:border-text-muted"
            />
            <button
              type="submit"
              className="rounded bg-primary-container px-space-lg py-space-sm font-headline text-body-sm font-bold uppercase tracking-wider text-text-primary transition-colors hover:bg-accent-red-hover"
            >
              Search
            </button>
          </form>
        </header>

        {notice}

        {result.ok && result.value.length > 0 && (
          <>
            {query && (
              <p className="text-body-sm text-text-muted">
                {filtered.length} result{filtered.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
              </p>
            )}
            {filtered.length === 0 ? (
              <StateNotice title="No fault codes matched your search">
                Try the code on its own (e.g. &ldquo;P0420&rdquo;), or a keyword from the symptom or vehicle.
              </StateNotice>
            ) : (
              <>
                <ul className="grid gap-space-sm sm:grid-cols-2 lg:grid-cols-3">
                  {page.items.map((c) => (
                    <FaultCodeCard key={c.id} code={c} />
                  ))}
                </ul>
                <Pagination basePath="/fault-codes" page={page.page} pageCount={page.pageCount} params={{ q: query || undefined }} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
