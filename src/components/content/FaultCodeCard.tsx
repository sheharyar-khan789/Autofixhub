import Link from "next/link";
import type { FaultCode } from "@/lib/models";

export function FaultCodeCard({ code }: { code: FaultCode }) {
  return (
    <li>
      <Link
        href={`/fault-codes/${code.code.toLowerCase()}`}
        className="card-lift group flex h-full flex-col gap-space-sm rounded-lg border border-border-subtle bg-surface-raised p-space-md hover:border-border-medium hover:bg-surface-card md:p-space-lg"
      >
        <span className="flex flex-wrap items-baseline justify-between gap-space-sm">
          <span className="rounded border border-status-fault-red/50 bg-status-fault-red/10 px-space-sm py-0.5 font-code text-label-code font-bold text-status-fault-red">
            {code.code}
          </span>
          <span className="font-code text-label-telemetry uppercase text-text-muted">
            {code.scope === "generic" ? "Generic OBD-II" : "Vehicle-specific"}
          </span>
        </span>
        <span className="font-headline text-headline-sm text-text-primary group-hover:underline group-hover:decoration-border-medium group-hover:underline-offset-4">
          {code.title}
        </span>
        {code.system && <span className="font-code text-label-telemetry text-text-muted">{code.system}</span>}
        <span className="line-clamp-2 text-body-sm text-text-muted">{code.meaning}</span>
      </Link>
    </li>
  );
}
