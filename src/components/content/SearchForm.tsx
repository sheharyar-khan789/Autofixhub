import { Search } from "lucide-react";

export function SearchForm({
  defaultValue = "",
  id = "site-search",
  size = "md",
}: {
  defaultValue?: string;
  id?: string;
  /** "lg": the homepage search console (full width, taller field). */
  size?: "md" | "lg";
}) {
  const lg = size === "lg";
  return (
    <form action="/search" method="GET" role="search" className={`flex w-full gap-space-sm ${lg ? "" : "max-w-xl"}`}>
      <label htmlFor={id} className="sr-only">
        Search guides, fault codes and videos
      </label>
      <input
        id={id}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="e.g. VW TDI turbo, Prius hybrid warning, P0401…"
        className={`w-full min-w-0 rounded-md border border-border-medium bg-surface-card px-space-md py-space-sm text-text-primary placeholder:text-text-muted/80 focus:border-text-muted ${
          lg ? "min-h-12 text-body-md md:min-h-14 md:px-space-lg md:text-body-lg" : "min-h-11 text-body-md"
        }`}
      />
      <button
        type="submit"
        aria-label="Search"
        className={`flex shrink-0 items-center gap-space-xs rounded-md bg-primary-container px-space-md py-space-sm font-headline text-body-sm font-bold uppercase tracking-wider text-text-primary transition-colors hover:bg-accent-red-hover ${
          lg ? "min-h-12 md:min-h-14 md:px-space-lg" : "min-h-11"
        }`}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Search</span>
      </button>
    </form>
  );
}
