import Link from "next/link";
import type { ContentCategory, FaultCode, Guide, Video } from "@/lib/models";
import { YouTubeChannelLink } from "./YouTubeChannelLink";

function LinkList({ items }: { items: { href: string; label: string; sub?: string }[] }) {
  return (
    <ul className="flex flex-col gap-space-xs">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="flex flex-col rounded border border-border-subtle bg-surface-card px-space-md py-space-sm transition-colors hover:border-border-medium"
          >
            <span className="text-body-sm font-semibold text-text-primary">{item.label}</span>
            {item.sub && <span className="text-body-sm text-text-muted">{item.sub}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-space-xs font-code text-label-code uppercase tracking-wider text-text-muted">{title}</p>
      {children}
    </div>
  );
}

/**
 * "Continue exploring" sidebar for guide, fault-code and video pages. Renders only the
 * groups that have real links, always ending with the YouTube channel so a reader can
 * move from the written page to the videos.
 */
export function RelatedContent({
  guides = [],
  faultCodes = [],
  videos = [],
  categories = [],
  channelUrl,
  guidesTitle = "Related guides",
}: {
  guides?: Guide[];
  faultCodes?: FaultCode[];
  videos?: Video[];
  categories?: ContentCategory[];
  channelUrl?: string;
  guidesTitle?: string;
}) {
  const hasAny = guides.length + faultCodes.length + videos.length + categories.length > 0;
  return (
    <div className="flex flex-col gap-space-lg rounded border border-border-subtle bg-surface-raised p-space-lg">
      <h2 className="font-headline text-headline-sm text-text-primary">Continue exploring</h2>
      {hasAny && (
        <div className="flex flex-col gap-space-md">
          {videos.length > 0 && (
            <Group title="Videos">
              <LinkList items={videos.map((v) => ({ href: `/videos/${v.slug}`, label: v.title }))} />
            </Group>
          )}
          {guides.length > 0 && (
            <Group title={guidesTitle}>
              <LinkList items={guides.map((g) => ({ href: `/guides/${g.slug}`, label: g.title, sub: g.excerpt }))} />
            </Group>
          )}
          {faultCodes.length > 0 && (
            <Group title="Fault codes">
              <LinkList
                items={faultCodes.map((f) => ({ href: `/fault-codes/${f.code.toLowerCase()}`, label: `${f.code} – ${f.title}` }))}
              />
            </Group>
          )}
          {categories.length > 0 && (
            <Group title="Categories">
              <ul className="flex flex-wrap gap-space-xs">
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/categories/${c.slug}`}
                      className="inline-flex min-h-11 items-center rounded border border-border-medium bg-surface-card px-space-md font-code text-body-sm text-text-primary hover:border-text-muted"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Group>
          )}
        </div>
      )}
      <div className="flex flex-col items-start gap-space-xs">
        <YouTubeChannelLink href={channelUrl} label="More videos on YouTube" variant="ghost" className="!px-0" />
        <Link href="/guides" className="font-code text-body-sm font-semibold underline underline-offset-4">
          Browse all guides
        </Link>
      </div>
    </div>
  );
}
