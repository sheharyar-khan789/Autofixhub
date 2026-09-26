import { LoadingLabel, Skeleton } from "@/components/ui/Skeleton";

/**
 * Search results loading state. Deliberately scoped to /search only: a loading boundary
 * above routes that call notFound() makes Next stream a 200 before the 404 is known
 * ("soft 404"), which the e2e 404 tests caught. Detail pages are ISR and don't need one.
 */
export default function SearchLoading() {
  return (
    <div className="px-gutter py-space-xl">
      <LoadingLabel>Searching…</LoadingLabel>
      <div className="mx-auto flex max-w-7xl flex-col gap-space-xl">
        <div className="flex max-w-3xl flex-col gap-space-sm">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
        </div>
        <div className="grid gap-space-sm sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    </div>
  );
}
