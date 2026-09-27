import Link from "next/link";
import type { ReactNode } from "react";
import type { BookingStatus, PublishStatus } from "@/lib/models";
import type { FieldErrors } from "@/lib/admin/forms";
import { BOOKING_STATUS_LABELS } from "@/lib/models";

/**
 * Admin design system primitives. Every admin screen composes these so the CMS
 * looks and behaves like one product (tokens come from globals.css @theme).
 */

export const inputClass =
  "w-full min-h-11 rounded-md border border-border-medium bg-surface-container-lowest px-space-md py-space-sm text-body-md font-normal text-text-primary placeholder:text-text-muted/70 transition-colors hover:border-text-muted/60 focus:border-text-primary disabled:opacity-60 aria-[invalid=true]:border-status-fault-red";
export const labelClass = "flex flex-col gap-space-xs text-body-sm font-semibold text-text-primary";
export const hintClass = "text-body-sm font-normal text-text-muted";
export const cardClass = "rounded-lg border border-border-subtle bg-surface-raised p-space-lg";
export const tableWrapClass = "admin-table-wrap overflow-x-auto rounded-lg border border-border-subtle bg-surface-raised";
export const thClass = "px-space-md py-space-sm text-left font-code text-label-telemetry uppercase tracking-wider text-text-muted";
export const tdClass = "px-space-md py-space-sm align-middle text-body-sm text-text-primary";
export const trClass = "border-t border-border-subtle transition-colors hover:bg-surface-card/60";

const btn =
  "inline-flex min-h-10 items-center justify-center gap-space-xs rounded-md px-space-md py-space-sm text-body-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
export const primaryBtn = `${btn} bg-primary-container text-text-primary hover:bg-accent-red-hover`;
export const secondaryBtn = `${btn} border border-border-medium bg-surface-card text-text-primary hover:border-text-muted`;
export const dangerBtn = `${btn} border border-status-fault-red/60 text-status-fault-red hover:bg-status-fault-red/10`;
/** Compact text-style action used inside table rows. */
export const rowActionClass =
  "inline-flex min-h-9 items-center rounded px-space-sm text-body-sm font-semibold text-text-muted transition-colors hover:bg-surface-card hover:text-text-primary";

const PUBLISH_STATUS_STYLES: Record<PublishStatus, string> = {
  draft: "border-border-medium text-text-muted",
  published: "border-status-pass-green/40 bg-status-pass-green/10 text-status-pass-green",
  archived: "border-border-subtle text-text-muted line-through",
};

export function PublishBadge({ status }: { status: PublishStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-space-sm py-0.5 font-code text-label-badge uppercase tracking-wider ${PUBLISH_STATUS_STYLES[status]}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${status === "published" ? "bg-status-pass-green" : "bg-text-muted"}`} />
      {status}
    </span>
  );
}

const BOOKING_STATUS_STYLES: Record<BookingStatus, string> = {
  new: "bg-status-amber-warning/20 text-status-amber-warning",
  contacted: "bg-primary/15 text-primary",
  confirmed: "bg-status-pass-green/15 text-status-pass-green",
  in_progress: "bg-status-pass-green/15 text-status-pass-green",
  completed: "bg-surface-elevated text-text-muted",
  cancelled: "bg-status-fault-red/15 text-status-fault-red",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-block rounded px-space-sm py-0.5 font-code text-label-badge uppercase ${BOOKING_STATUS_STYLES[status]}`}>
      {BOOKING_STATUS_LABELS[status]}
    </span>
  );
}

export interface AdminCrumb {
  name: string;
  href?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  action,
}: {
  title: string;
  description?: ReactNode;
  breadcrumbs?: AdminCrumb[];
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-space-sm">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="font-code text-label-telemetry text-text-muted">
          <ol className="flex flex-wrap items-center gap-1">
            {breadcrumbs.map((c, i) => (
              <li key={`${c.name}-${i}`} className="flex items-center gap-1">
                {i > 0 && <span aria-hidden="true">/</span>}
                {c.href ? (
                  <Link href={c.href} className="hover:text-text-primary">{c.name}</Link>
                ) : (
                  <span aria-current="page" className="text-text-primary">{c.name}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-space-md">
        <div className="min-w-0">
          <h1 className="font-headline text-headline-md text-text-primary">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-body-sm text-text-muted">{description}</p>}
        </div>
        {action && <div className="flex flex-wrap items-center gap-space-sm">{action}</div>}
      </div>
    </header>
  );
}

export function EmptyState({ title, children, action }: { title?: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-space-sm rounded-lg border border-dashed border-border-medium bg-surface-raised/40 p-space-lg">
      {title && <p className="font-headline text-headline-sm text-text-primary">{title}</p>}
      {children && <div className="text-body-sm text-text-muted">{children}</div>}
      {action}
    </div>
  );
}

export function ErrorState({ children, retryHref }: { children: ReactNode; retryHref?: string }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-space-sm rounded-lg border border-status-fault-red/50 bg-status-fault-red/5 p-space-lg">
      <p className="font-headline text-headline-sm text-text-primary">Couldn&apos;t load this</p>
      <div className="text-body-sm text-text-muted">{children}</div>
      {retryHref && <Link href={retryHref} className={secondaryBtn}>Retry</Link>}
    </div>
  );
}

export function FormMessage({ error, success }: { error?: string | null; success?: string | null }) {
  if (!error && !success) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-md border px-space-md py-space-sm text-body-sm ${
        error ? "border-status-fault-red/50 bg-status-fault-red/10 text-text-primary" : "border-status-pass-green/40 bg-status-pass-green/10 text-text-primary"
      }`}
    >
      {error ?? success}
    </p>
  );
}

/**
 * `name` plus the error wiring for an input: `{...fieldProps(state.fieldErrors, "slug")}`.
 * Pair with <FieldError> after the input.
 */
export function fieldProps(errors: FieldErrors | undefined, name: string) {
  const invalid = Boolean(errors?.[name]);
  return { name, "aria-invalid": invalid || undefined, "aria-describedby": invalid ? `${name}-error` : undefined };
}

/**
 * The error for one input, shown right under it. aria-hidden keeps the message out of
 * the enclosing <label>'s accessible name; screen readers still get it through the
 * input's aria-describedby.
 */
export function FieldError({ errors, name }: { errors?: FieldErrors; name: string }) {
  const message = errors?.[name];
  if (!message) return null;
  return (
    <span id={`${name}-error`} aria-hidden="true" data-field-error={name} className="text-body-sm font-normal text-status-fault-red">
      {message}
    </span>
  );
}

/** Visually marks a required field (the input itself also carries `required`). */
export function Req() {
  return (
    <span className="text-status-fault-red" aria-hidden="true">
      {" "}*
    </span>
  );
}

export function StatCard({ label, value, href, hint }: { label: string; value: number | string; href?: string; hint?: string }) {
  const body = (
    <>
      <span className="font-code text-label-telemetry uppercase tracking-wider text-text-muted">{label}</span>
      <span className="font-headline text-headline-lg text-text-primary tabular-nums">{value}</span>
      {hint && <span className="text-body-sm text-text-muted">{hint}</span>}
    </>
  );
  const cls = `${cardClass} flex flex-col gap-1 !p-space-md`;
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-border-medium hover:bg-surface-card`}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
