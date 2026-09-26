import Link from "next/link";
import type { BusinessSettings } from "@/lib/models";
import { formatAddress, telHref } from "@/lib/contact";
import { Logo } from "@/components/ui/Logo";

export function SiteFooter({ settings }: { settings: BusinessSettings | null }) {
  const legalLines = [
    settings?.legalName,
    settings?.companyNumber ? `Company number ${settings.companyNumber}` : null,
    settings?.vatNumber ? `VAT number ${settings.vatNumber}` : null,
  ].filter(Boolean) as string[];
  const links = settings?.socialLinks;
  const social: [string, string][] = [];
  for (const [label, href] of [
    ["YouTube channel", links?.youtube],
    ["Facebook", links?.facebook],
    ["Instagram", links?.instagram],
    ["TikTok", links?.tiktok],
    ["X", links?.x],
  ] as const) {
    if (href) social.push([label, href]);
  }
  return (
    <footer className="mt-space-xl bg-surface-container-lowest text-text-muted">
      <div className="grid gap-space-xl px-gutter py-space-xl md:grid-cols-3">
        <div className="flex flex-col gap-space-md">
          <Logo name={settings?.tradingName} />
          <p className="max-w-xs text-body-sm">
            Automotive repair knowledge, diagnostics and video guides for Volkswagen Group diesel and Toyota hybrid
            vehicles.
          </p>
          {settings?.address && <p className="text-body-sm">{formatAddress(settings.address)}</p>}
          {settings?.phone && (
            <a className="font-code text-text-primary hover:text-primary" href={telHref(settings.phone)}>
              {settings.phone}
            </a>
          )}
          {settings?.email && (
            <a className="text-body-sm hover:text-text-primary" href={`mailto:${settings.email}`}>
              {settings.email}
            </a>
          )}
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-space-sm text-body-sm">
          <Link className="hover:text-text-primary" href="/guides">Repair guides</Link>
          <Link className="hover:text-text-primary" href="/fault-codes">Fault code database</Link>
          <Link className="hover:text-text-primary" href="/videos">Videos</Link>
          <Link className="hover:text-text-primary" href="/categories">Categories</Link>
          <Link className="hover:text-text-primary" href="/search">Search</Link>
          <Link className="hover:text-text-primary" href="/about">About</Link>
          <Link className="hover:text-text-primary" href="/contact">Contact</Link>
          <Link className="hover:text-text-primary" href="/privacy">Privacy notice</Link>
        </nav>
        <div className="flex flex-col gap-space-md text-body-sm">
          {social.length > 0 && (
            <ul className="flex flex-col gap-space-xs" aria-label="Follow">
              {social.map(([label, href]) => (
                <li key={label}>
                  <a className="hover:text-text-primary" href={href} target="_blank" rel="noopener noreferrer">
                    {label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {legalLines.length > 0 && (
            <ul className="flex flex-col gap-space-xs">
              {legalLines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="border-t border-border-subtle px-gutter py-space-md text-label-telemetry font-code">
        © {new Date().getFullYear()} {settings?.tradingName ?? "AutoFixHub"}. All rights reserved.
      </div>
      <div className="h-16 lg:hidden" aria-hidden="true" />
    </footer>
  );
}
