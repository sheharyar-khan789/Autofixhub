import type { ReactNode } from "react";

/**
 * Marks content that must be supplied by the business. Rendered only while
 * SHOW_PLACEHOLDERS is not "false", so it can be switched off at launch.
 */
export function Placeholder({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div
      className="rounded border border-dashed border-border-medium bg-surface-raised p-space-md text-text-muted"
      data-placeholder
    >
      <p className="font-code text-label-badge uppercase tracking-wider text-status-amber-warning">
        Placeholder: {label}
      </p>
      {children && <div className="mt-space-xs text-body-sm">{children}</div>}
    </div>
  );
}
