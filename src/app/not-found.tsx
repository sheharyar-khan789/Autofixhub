import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LinkButton } from "@/components/ui/Button";
import { getSettingsOrNull } from "@/lib/data";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/** Global 404 (outside the (site) layout), so it renders the public chrome itself. */
export default async function NotFound() {
  const settings = await getSettingsOrNull();
  return (
    <>
      <SiteHeader settings={settings} />
      <main id="main" className="min-h-[70vh] pt-[var(--header-h)]">
    <div className="px-gutter py-space-xl">
      <div className="mx-auto flex max-w-3xl flex-col gap-space-md">
        <p className="font-code text-label-code text-status-fault-red">404</p>
        <h1 className="font-headline text-headline-xl-mobile text-text-primary md:text-headline-xl">Page not found</h1>
        <p className="text-body-lg text-text-muted">
          This page doesn&apos;t exist, or it is no longer published.
        </p>
        <div className="flex flex-wrap gap-space-sm">
          <LinkButton href="/">Back to home</LinkButton>
          <LinkButton href="/videos" variant="secondary">
            Videos
          </LinkButton>
          <LinkButton href="/guides" variant="secondary">
            Repair guides
          </LinkButton>
          <LinkButton href="/fault-codes" variant="secondary">
            Fault codes
          </LinkButton>
        </div>
      </div>
    </div>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
