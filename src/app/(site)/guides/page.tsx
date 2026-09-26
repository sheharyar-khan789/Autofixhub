import type { Metadata } from "next";
import { GuideCard } from "@/components/content/GuideCard";
import { guidesNotice } from "@/components/content/ContentState";
import { Pagination } from "@/components/content/Pagination";
import { SearchForm } from "@/components/content/SearchForm";
import { paginate } from "@/lib/content";
import { getGuides } from "@/lib/data";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Repair Guides",
  description:
    "Repair guides on Volkswagen Group diesel and Toyota hybrid problems: symptoms, likely causes, diagnosis, fault codes and related videos.",
  alternates: { canonical: "/guides" },
};

export default async function GuidesPage({ searchParams }: PageProps<"/guides">) {
  const { page: rawPage } = await searchParams;
  const guides = await getGuides();
  const notice = guidesNotice(guides);
  const page = paginate(guides.ok ? guides.value : [], rawPage);

  return (
    <div className="px-gutter py-space-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-space-xl">
        <header className="flex max-w-3xl flex-col gap-space-sm">
          <h1 className="font-headline text-headline-xl-mobile text-text-primary md:text-headline-xl">Repair guides</h1>
          <p className="text-body-lg text-text-muted">
            Practical guides from hands-on repair work: symptoms, likely causes, diagnosis, related fault codes and
            videos for specific vehicle problems.
          </p>
          <SearchForm />
        </header>

        {notice}

        {page.items.length > 0 && (
          <ul className="grid gap-space-sm sm:grid-cols-2 lg:grid-cols-3">
            {page.items.map((g) => (
              <GuideCard key={g.id} guide={g} />
            ))}
          </ul>
        )}
        <Pagination basePath="/guides" page={page.page} pageCount={page.pageCount} />
      </div>
    </div>
  );
}
