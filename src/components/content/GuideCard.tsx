import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { isSafeImageRef } from "@/lib/admin/forms";
import type { Guide } from "@/lib/models";

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;

/**
 * Article card: system label, title, summary, then vehicle + updated date. Image only when
 * the guide has one. `featured` is the larger lead story used on the homepage.
 */
export function GuideCard({ guide, featured = false }: { guide: Guide; featured?: boolean }) {
  const vehicle = [guide.vehicleMake, guide.vehicleModel].filter(Boolean).join(" ");
  const updated = formatDate(guide.updatedAt ?? guide.publishedAt);
  const image = guide.featuredImage && isSafeImageRef(guide.featuredImage) ? guide.featuredImage : null;
  return (
    <li className={featured ? "sm:col-span-2 lg:row-span-2" : undefined}>
      <Link
        href={`/guides/${guide.slug}`}
        className="card-lift group relative flex h-full flex-col overflow-hidden rounded-lg border border-border-subtle bg-surface-raised hover:border-border-medium hover:bg-surface-card"
      >
        {image && (
          <span className="block overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- author-supplied https/site image, validated on save */}
            <img
              src={image}
              alt=""
              loading="lazy"
              decoding="async"
              className={`w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03] ${featured ? "aspect-[16/8]" : "aspect-[16/9]"}`}
            />
          </span>
        )}
        <span className={`flex flex-1 flex-col gap-space-sm ${featured ? "p-space-lg md:p-8" : "p-space-md md:p-space-lg"}`}>
          <span className="flex items-start justify-between gap-space-md">
            {guide.problemCategory ? (
              <span className="font-code text-label-badge uppercase tracking-[0.16em] text-status-fault-red">{guide.problemCategory}</span>
            ) : (
              <span />
            )}
            <ArrowUpRight
              className="h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:text-text-primary motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
          <span
            className={`font-headline tracking-[-0.01em] text-text-primary ${
              featured ? "text-headline-md md:text-[2rem] md:leading-[1.15]" : "text-headline-sm"
            }`}
          >
            {guide.title}
          </span>
          <span className={`text-text-muted ${featured ? "line-clamp-4 text-body-md md:text-body-lg" : "line-clamp-3 text-body-sm"}`}>
            {guide.excerpt}
          </span>
          {(vehicle || updated) && (
            <span className="mt-auto flex flex-wrap items-center gap-x-space-sm gap-y-1 border-t border-border-subtle pt-space-sm font-code text-label-telemetry text-text-muted">
              {vehicle && <span className="text-text-primary">{vehicle}</span>}
              {vehicle && updated && <span aria-hidden="true">·</span>}
              {updated && <span>Updated {updated}</span>}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
