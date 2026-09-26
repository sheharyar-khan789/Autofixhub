import { LoadingLabel, Skeleton } from "@/components/ui/Skeleton";

/** Shown inside the admin shell while a page's server data loads (no blank screen, no spinner). */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-space-xl">
      <LoadingLabel>Loading…</LoadingLabel>
      <div className="flex flex-col gap-space-sm">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-space-sm md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="flex flex-col gap-space-sm rounded-lg border border-border-subtle p-space-md">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    </div>
  );
}
