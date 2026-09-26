import type { Metadata } from "next";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { LinkButton } from "@/components/ui/Button";
import { catalogNotice } from "@/components/services/CatalogState";
import { ServiceCard } from "@/components/services/ServiceCard";
import { getCatalog } from "@/lib/data";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Services",
  description:
    "Volkswagen Group diesel and Toyota hybrid work: gearbox and clutch, DPF, turbo and injectors, timing belts, oil leaks, wiring and loom faults, and electrical diagnostics.",
  alternates: { canonical: "/services" },
};

export default async function ServicesPage() {
  const catalog = await getCatalog();
  const notice = catalogNotice(catalog);
  return (
    <div className="px-gutter py-space-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-space-xl">
        <header className="flex max-w-3xl flex-col gap-space-sm">
          <h1 className="font-headline text-headline-xl-mobile text-text-primary md:text-headline-xl">Services</h1>
          <p className="text-body-lg text-text-muted">
            Prices are shown where the workshop has set one. Otherwise, request a booking and describe the problem for a quote.
          </p>
        </header>

        {notice}

        {catalog.ok && catalog.value.services.length > 0 && (
          <>
            <nav aria-label="Service categories" className="flex flex-wrap gap-space-sm">
              {catalog.value.categories
                .filter((c) => catalog.value.services.some((s) => s.categoryId === c.id))
                .map((c) => (
                  <a
                    key={c.id}
                    href={`#${c.slug}`}
                    className="rounded border border-border-medium bg-surface-card px-space-md py-space-xs text-body-sm text-text-primary hover:border-text-muted"
                  >
                    {c.name}
                  </a>
                ))}
            </nav>
            {catalog.value.categories.map((c) => {
              const services = catalog.value.services.filter((s) => s.categoryId === c.id);
              if (services.length === 0) return null;
              return (
                <section key={c.id} id={c.slug} aria-labelledby={`${c.slug}-h`} className="scroll-mt-32">
                  <div className="mb-space-md flex items-start gap-space-md">
                    <CategoryIcon iconKey={c.iconKey} className="mt-1 h-6 w-6 text-status-fault-red" />
                    <div>
                      <h2 id={`${c.slug}-h`} className="font-headline text-headline-md text-text-primary">{c.name}</h2>
                      {c.description && <p className="text-body-md text-text-muted">{c.description}</p>}
                    </div>
                  </div>
                  <ul className="grid gap-space-sm sm:grid-cols-2 lg:grid-cols-3">
                    {services.map((s) => (
                      <ServiceCard key={s.id} service={s} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </>
        )}

        <div className="flex flex-col items-start gap-space-sm rounded border border-border-subtle bg-surface-raised p-space-lg">
          <p className="font-headline text-headline-sm text-text-primary">Not sure which service you need?</p>
          <p className="text-body-md text-text-muted">Describe the problem in a booking request and the workshop will advise.</p>
          <LinkButton href="/book">Book a service</LinkButton>
        </div>
      </div>
    </div>
  );
}
