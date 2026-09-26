/** Hexagon mark from the Stitch logo. The name comes from settings (falling back to the confirmed brand, AutoFixHub). */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 52" className={className} fill="none" aria-hidden="true">
      <path d="M24 2L44 14V38L24 50L4 38V14L24 2Z" stroke="#D71920" strokeWidth="3.5" strokeLinejoin="round" fill="#17191B" />
      <path d="M24 10L36 17V35L24 42L12 35V17L24 10Z" fill="#D71920" fillOpacity="0.15" stroke="#D71920" strokeWidth="1.5" />
      <path d="M24 17V35M18 26L30 26" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ name, showTagline = true }: { name?: string; showTagline?: boolean }) {
  return (
    <span className="flex items-center gap-space-sm">
      <LogoMark />
      <span className="flex flex-col">
        <span className="font-headline text-headline-sm uppercase tracking-tight text-text-primary">
          {name ?? "AutoFixHub"}
        </span>
        {showTagline && (
          <span className="font-code text-label-telemetry uppercase tracking-wider text-text-muted">
            Repair Knowledge &amp; Videos
          </span>
        )}
      </span>
    </span>
  );
}
