import Link from "next/link";
import { formatPrice, type Service } from "@/lib/models";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <li>
      <Link
        href={`/services/${service.slug}`}
        className="flex h-full flex-col gap-space-sm rounded border border-border-subtle bg-surface-raised p-space-md transition-colors hover:border-border-medium hover:bg-surface-card"
      >
        <span className="font-headline text-headline-sm text-text-primary">{service.name}</span>
        <span className="text-body-sm text-text-muted">{service.summary}</span>
        <span className="mt-auto pt-space-xs font-code text-label-code text-text-muted">{formatPrice(service)}</span>
      </Link>
    </li>
  );
}
