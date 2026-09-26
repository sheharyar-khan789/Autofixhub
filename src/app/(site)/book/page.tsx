import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingForm, type ServiceGroup } from "@/components/booking/BookingForm";
import { catalogNotice } from "@/components/services/CatalogState";
import { StateNotice } from "@/components/ui/Section";
import { getCatalog, getSettingsOrNull } from "@/lib/data";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Book a service",
  description: "Send a booking request with your vehicle details, preferred date and a description of the problem.",
  alternates: { canonical: "/book" },
};

export default async function BookPage() {
  const [catalog, settings] = await Promise.all([getCatalog(), getSettingsOrNull()]);
  const notice = catalogNotice(catalog);
  const groups: ServiceGroup[] = catalog.ok
    ? catalog.value.categories
        .map((c) => ({
          category: c.name,
          services: catalog.value.services
            .filter((s) => s.categoryId === c.id && s.bookable)
            .map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
        }))
        .filter((g) => g.services.length > 0)
    : [];

  return (
    <div className="px-gutter py-space-xl">
      <div className="mx-auto flex max-w-3xl flex-col gap-space-xl">
        <header className="flex flex-col gap-space-sm">
          <h1 className="font-headline text-headline-xl-mobile text-text-primary md:text-headline-xl">Book a service</h1>
          <p className="text-body-lg text-text-muted">
            Send a request with your preferred date and time. The workshop confirms the appointment with you.
          </p>
        </header>
        {notice && groups.length === 0 ? (
          <div className="flex flex-col gap-space-md">
            {notice}
            <StateNotice title="Contact the workshop instead">
              Online booking needs the service list. Use the contact details on the Contact page.
            </StateNotice>
          </div>
        ) : (
          <Suspense fallback={<p className="text-text-muted" role="status">Loading form…</p>}>
            <BookingForm groups={groups} contactPhone={settings?.phone} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
