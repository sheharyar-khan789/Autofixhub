import type { ReactNode } from "react";

/**
 * Section surfaces, so a long page has rhythm instead of one repeated background:
 * - base: the page surface
 * - raised: slightly lighter graphite with a faint dot grid
 * - technical: near-black with a fine engineering grid (diagnostics content)
 * - cinematic: deep, with soft light from above (video and closing content)
 */
export type SectionTone = "base" | "raised" | "technical" | "cinematic";

const TONES: Record<SectionTone, string> = {
  base: "",
  raised: "section-texture bg-surface-raised",
  technical: "section-technical",
  cinematic: "section-cinematic",
};

export function Section({
  id,
  eyebrow,
  index,
  title,
  lead,
  action,
  children,
  tone = "base",
}: {
  id?: string;
  /** Small technical label above the heading (e.g. "Knowledge base"). */
  eyebrow?: string;
  /** Optional chapter number shown before the eyebrow (e.g. "02"). */
  index?: string;
  title: string;
  lead?: string;
  /** Optional link/button aligned with the heading on wide screens (e.g. "All guides"). */
  action?: ReactNode;
  children: ReactNode;
  tone?: SectionTone;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={`section-rule px-gutter py-14 md:py-20 ${TONES[tone]}`}>
      <div className="relative z-[1] mx-auto flex max-w-7xl flex-col gap-space-lg md:gap-10">
        <div className="flex flex-col gap-space-md md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-3xl flex-col gap-space-sm">
            {eyebrow && (
              <p className="flex items-center gap-space-sm font-code text-label-badge uppercase tracking-[0.2em] text-text-muted">
                {index ? (
                  <span className="tabular-nums text-status-fault-red">{index}</span>
                ) : (
                  <span className="h-px w-6 bg-status-fault-red" aria-hidden="true" />
                )}
                {index && <span className="h-px w-6 bg-border-medium" aria-hidden="true" />}
                {eyebrow}
              </p>
            )}
            <h2
              id={headingId}
              className="font-headline text-headline-lg-mobile tracking-[-0.02em] text-text-primary md:text-[2.5rem] md:leading-[1.1]"
            >
              {title}
            </h2>
            {lead && <p className="max-w-2xl text-body-lg text-text-muted">{lead}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}

export function StateNotice({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children?: ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded border p-space-lg ${
        tone === "error" ? "border-status-fault-red bg-surface-raised" : "border-border-medium bg-surface-raised"
      }`}
    >
      <p className="font-headline text-headline-sm text-text-primary">{title}</p>
      {children && <div className="mt-space-xs text-body-md text-text-muted">{children}</div>}
    </div>
  );
}
