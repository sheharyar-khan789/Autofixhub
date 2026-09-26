/** Shimmer-free, motion-safe skeleton block (pulses only when motion is allowed). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded-md bg-surface-card motion-safe:animate-pulse ${className}`} />;
}

/** Screen-reader announcement for a loading region. */
export function LoadingLabel({ children = "Loading…" }: { children?: string }) {
  return (
    <p role="status" className="sr-only">
      {children}
    </p>
  );
}
