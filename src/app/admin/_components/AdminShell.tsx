"use client";

import {
  Activity, BookOpen, CalendarCheck, ChevronDown, CircleUser, ExternalLink, FolderTree, ImageIcon, LayoutDashboard,
  LogOut, Menu, MessageSquareQuote, ScanSearch, Search, Settings, SquarePlay, Wrench, X, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/ui/Logo";
import type { NavGroup, NavIcon } from "./nav";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  guides: BookOpen,
  videos: SquarePlay,
  faultCodes: ScanSearch,
  categories: FolderTree,
  media: ImageIcon,
  seo: Search,
  settings: Settings,
  activity: Activity,
  account: CircleUser,
  bookings: CalendarCheck,
  services: Wrench,
  reviews: MessageSquareQuote,
};

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-col gap-space-lg">
      {groups.map((g) => (
        <div key={g.label} className="flex flex-col gap-1">
          <p className="px-space-sm font-code text-label-badge uppercase tracking-[0.14em] text-text-muted/80">{g.label}</p>
          <ul className="flex flex-col gap-0.5">
            {g.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex min-h-10 items-center gap-space-sm rounded-md px-space-sm text-body-sm transition-colors ${
                      active
                        ? "bg-surface-card font-semibold text-text-primary before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded before:bg-primary-container"
                        : "text-text-muted hover:bg-surface-card/60 hover:text-text-primary"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link href="/admin" onClick={onClick} className="flex items-center gap-space-sm">
      <LogoMark className="h-7 w-7" />
      <span className="flex flex-col leading-none">
        <span className="font-headline text-body-md font-bold uppercase tracking-tight text-text-primary">AutoFixHub</span>
        <span className="font-code text-label-badge uppercase tracking-wider text-text-muted">Content admin</span>
      </span>
    </Link>
  );
}

function AccountMenu({ email, role }: { email: string; role: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } finally {
      // Always leave: even if the network call failed, the user asked to go.
      router.replace("/admin/login");
      router.refresh();
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-10 items-center gap-space-sm rounded-md border border-border-subtle px-space-sm text-body-sm text-text-primary transition-colors hover:border-border-medium"
      >
        <CircleUser className="h-5 w-5 text-text-muted" aria-hidden="true" />
        <span className="hidden max-w-[14rem] truncate sm:inline">{email}</span>
        <span className="sr-only sm:hidden">Account</span>
        <ChevronDown className="h-4 w-4 text-text-muted" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-space-xs w-64 rounded-lg border border-border-medium bg-surface-card p-space-xs shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)]">
          <div className="border-b border-border-subtle px-space-sm pb-space-sm pt-space-xs">
            <p className="truncate text-body-sm font-semibold text-text-primary">{email}</p>
            <p className="font-code text-label-telemetry uppercase text-text-muted">{role}</p>
          </div>
          <Link role="menuitem" href="/admin/account" onClick={() => setOpen(false)} className="mt-space-xs flex min-h-10 items-center gap-space-sm rounded px-space-sm text-body-sm text-text-primary hover:bg-surface-elevated">
            <CircleUser className="h-4 w-4" aria-hidden="true" /> Account
          </Link>
          <button role="menuitem" type="button" onClick={signOut} disabled={signingOut} className="flex min-h-10 w-full items-center gap-space-sm rounded px-space-sm text-left text-body-sm text-text-primary hover:bg-surface-elevated disabled:opacity-60">
            <LogOut className="h-4 w-4" aria-hidden="true" /> {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}

export function AdminShell({
  groups,
  email,
  role,
  children,
}: {
  groups: NavGroup[];
  email: string;
  role: string;
  children: ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  // Lock background scroll while the mobile drawer is open (links close it via onNavigate).
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [drawer]);

  return (
    <div className="min-h-dvh bg-surface-base">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-space-md focus:top-space-md focus:z-[100] focus:rounded focus:bg-text-primary focus:px-space-md focus:py-space-sm focus:text-surface-base"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col gap-space-lg border-r border-border-subtle bg-surface-container-lowest px-space-md py-space-lg lg:flex">
        <Brand />
        <div className="-mx-space-xs flex-1 overflow-y-auto px-space-xs">
          <SidebarNav groups={groups} />
        </div>
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-space-lg border-r border-border-subtle bg-surface-container-lowest px-space-md py-space-lg">
            <div className="flex items-center justify-between">
              <Brand onClick={() => setDrawer(false)} />
              <button type="button" aria-label="Close navigation" onClick={() => setDrawer(false)} className="rounded-md p-space-sm text-text-muted hover:text-text-primary">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarNav groups={groups} onNavigate={() => setDrawer(false)} />
            </div>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-space-md border-b border-border-subtle bg-surface-base/95 px-gutter backdrop-blur supports-[backdrop-filter]:bg-surface-base/80">
          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              aria-label="Open navigation"
              aria-expanded={drawer}
              onClick={() => setDrawer(true)}
              className="rounded-md border border-border-subtle p-space-sm text-text-primary lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="lg:hidden">
              <Brand />
            </span>
          </div>
          <div className="flex items-center gap-space-sm">
            <Link href="/" target="_blank" className="hidden min-h-10 items-center gap-space-xs rounded-md px-space-sm text-body-sm text-text-muted transition-colors hover:text-text-primary sm:inline-flex">
              View site <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </Link>
            <AccountMenu email={email} role={role} />
          </div>
        </header>
        <main id="admin-main" className="mx-auto flex w-full max-w-6xl flex-col gap-space-xl px-gutter py-space-xl">
          {children}
        </main>
      </div>
    </div>
  );
}
