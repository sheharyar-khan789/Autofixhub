import { Clock, MapPin, MessageCircle, PhoneCall, Search, SquarePlay } from "lucide-react";
import Link from "next/link";
import type { BusinessSettings } from "@/lib/models";
import { formatAddress, hoursSummary, telHref, whatsappHref } from "@/lib/contact";
import { Logo } from "@/components/ui/Logo";
import { SiteNav, type NavItem } from "./SiteNav";

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/guides", label: "Guides" },
  { href: "/fault-codes", label: "Fault Codes" },
  { href: "/videos", label: "Videos" },
  { href: "/categories", label: "Categories" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ settings }: { settings: BusinessSettings | null }) {
  const hours = hoursSummary(settings);
  const address = settings?.address ? formatAddress(settings.address) : null;
  const showUtility = hours || address || settings?.phone || settings?.whatsapp;
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-surface-container-lowest">
      {showUtility && (
        <div data-utility-bar className="hidden bg-surface-container-low lg:block">
          <div className="flex h-9 items-center justify-between px-gutter text-body-sm text-text-muted">
            <div className="flex items-center gap-space-lg">
              {hours && (
                <span className="flex items-center gap-space-xs">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {hours}
                </span>
              )}
              {address && (
                <span className="flex items-center gap-space-xs">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {address}
                </span>
              )}
            </div>
            <div className="flex items-center gap-space-lg font-code">
              {settings?.phone && (
                <a href={telHref(settings.phone)} className="flex items-center gap-space-xs text-text-primary hover:text-primary">
                  <PhoneCall className="h-3.5 w-3.5 text-status-fault-red" aria-hidden="true" /> {settings.phone}
                </a>
              )}
              {settings?.whatsapp && (
                <a href={whatsappHref(settings.whatsapp)} className="flex items-center gap-space-xs text-status-pass-green hover:underline" rel="noopener" target="_blank">
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="relative flex h-20 items-center justify-between border-b border-border-subtle px-gutter">
        <Link href="/" aria-label={`${settings?.tradingName ?? "AutoFixHub"} home`}>
          <Logo name={settings?.tradingName} />
        </Link>
        <div className="flex items-center gap-space-md">
          <SiteNav items={NAV_ITEMS} youtube={settings?.socialLinks?.youtube} />
          <Link
            href="/search"
            aria-label="Search"
            className="hidden rounded border border-border-medium p-space-sm text-text-primary hover:border-text-muted xl:inline-flex"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </Link>
          {settings?.socialLinks?.youtube && (
            <a
              href={settings.socialLinks.youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-space-xs rounded bg-primary-container px-space-lg py-space-sm font-headline text-body-sm font-bold uppercase tracking-wider text-text-primary transition-colors hover:bg-accent-red-hover sm:inline-flex"
            >
              <SquarePlay className="h-4 w-4" aria-hidden="true" /> YouTube
              <span className="sr-only"> channel (opens in a new tab)</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
