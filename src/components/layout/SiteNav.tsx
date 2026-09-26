"use client";

import { ArrowUpRight, Menu, Search, SquarePlay, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface NavItem {
  href: string;
  label: string;
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Desktop: inline links. Below xl: a slide-in sheet that behaves as a modal dialog
 * (background scroll locked, focus moved in and trapped, Escape/backdrop close,
 * focus returned to the trigger), with safe-area padding for notched phones.
 */
export function SiteNav({ items, youtube }: { items: NavItem[]; youtube?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the dialog (the current page's link, or the first link).
    const focusables = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
    (panel?.querySelector<HTMLElement>('[aria-current="page"]') ?? focusables()[0])?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <>
      <nav aria-label="Main" className="hidden items-center gap-space-sm xl:flex">
        {items.map((i) => {
          const active = isActive(pathname, i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active ? "page" : undefined}
              className={`rounded px-space-sm py-space-xs text-body-sm transition-colors ${
                active ? "bg-surface-elevated font-bold text-text-primary" : "text-text-muted hover:text-text-primary"
              }`}
            >
              {i.label}
            </Link>
          );
        })}
      </nav>

      <button
        ref={triggerRef}
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border-medium text-text-primary transition-colors hover:border-text-muted xl:hidden"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Portalled to <body> so it sits above the fixed header and mobile dock stacking contexts. */}
      {open && createPortal(
        <div className="fixed inset-0 z-[80] xl:hidden" role="dialog" aria-modal="true" aria-label="Site menu" id="mobile-menu">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close menu"
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px] motion-safe:animate-[fade-in_180ms_ease-out]"
            onClick={() => close()}
          />
          <div
            ref={panelRef}
            className="absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col border-l border-border-medium bg-surface-container-lowest pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] shadow-[-24px_0_60px_-20px_rgba(0,0,0,0.8)] motion-safe:animate-[sheet-in_220ms_cubic-bezier(0.2,0.8,0.2,1)]"
          >
            <div className="flex items-center justify-between px-space-md pb-space-sm">
              <span className="font-code text-label-badge uppercase tracking-[0.18em] text-text-muted">Menu</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => close()}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border-medium text-text-primary hover:border-text-muted"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-space-sm">
              <ul className="flex flex-col">
                {items.map((i) => {
                  const active = isActive(pathname, i.href);
                  return (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        onClick={() => close(false)}
                        aria-current={active ? "page" : undefined}
                        className={`relative flex min-h-12 items-center rounded-md px-space-md font-headline text-headline-sm transition-colors ${
                          active
                            ? "bg-surface-card text-text-primary before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded before:bg-primary-container"
                            : "text-text-muted hover:bg-surface-card/60 hover:text-text-primary"
                        }`}
                      >
                        {i.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="flex flex-col gap-space-sm border-t border-border-subtle px-space-md pt-space-md">
              <Link
                href="/search"
                onClick={() => close(false)}
                className="flex min-h-12 items-center gap-space-sm rounded-md border border-border-medium px-space-md text-body-md text-text-primary hover:border-text-muted"
              >
                <Search className="h-5 w-5 text-text-muted" aria-hidden="true" /> Search guides
              </Link>
              {youtube && (
                <a
                  href={youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-12 items-center justify-between gap-space-sm rounded-md bg-primary-container px-space-md font-headline text-body-md font-bold uppercase tracking-wider text-text-primary hover:bg-accent-red-hover"
                >
                  <span className="flex items-center gap-space-sm">
                    <SquarePlay className="h-5 w-5" aria-hidden="true" /> YouTube channel
                  </span>
                  <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
