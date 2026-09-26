import { MobileDock } from "@/components/layout/MobileDock";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getSettingsOrNull } from "@/lib/data";
import { dataSource } from "@/lib/env";

/** Public website chrome: header, main landmark, footer and the mobile quick-links dock. */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettingsOrNull();
  const fixture = dataSource() === "memory";
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-space-md focus:top-space-md focus:z-[100] focus:rounded focus:bg-text-primary focus:px-space-md focus:py-space-sm focus:text-surface-base"
      >
        Skip to content
      </a>
      {fixture && (
        <p className="fixed bottom-20 left-space-sm z-[60] rounded bg-status-amber-warning px-space-sm py-1 font-code text-label-badge font-bold text-surface-base lg:bottom-space-sm">
          DEV FIXTURE DATA: not real business information
        </p>
      )}
      <SiteHeader settings={settings} />
      <main id="main" className="min-h-screen pt-[var(--header-h)]">
        {children}
      </main>
      <SiteFooter settings={settings} />
      <MobileDock settings={settings} />
    </>
  );
}
