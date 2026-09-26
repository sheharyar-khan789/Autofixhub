import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES, DASHBOARD_ROLES } from "@/lib/auth/permissions";
import { isNotConfigured, workshopFeaturesEnabled } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import { getDashboardStats, getRecentActivity, type ActivityItem, type StatKey } from "@/lib/admin/dashboard";
import { activityLine } from "../_components/activity";
import { EmptyState, ErrorState, PageHeader, StatCard, cardClass, primaryBtn, secondaryBtn } from "../_components/ui";

export const dynamic = "force-dynamic";

const CARDS: { key: StatKey; label: string; href: string }[] = [
  { key: "publishedGuides", label: "Published guides", href: "/admin/guides?status=published" },
  { key: "draftGuides", label: "Draft guides", href: "/admin/guides?status=draft" },
  { key: "publishedVideos", label: "Published videos", href: "/admin/videos?status=published" },
  { key: "publishedFaultCodes", label: "Published fault codes", href: "/admin/fault-codes?status=published" },
  { key: "draftFaultCodes", label: "Draft fault codes", href: "/admin/fault-codes?status=draft" },
  { key: "publishedCategories", label: "Categories", href: "/admin/categories" },
  { key: "mediaAssets", label: "Media assets", href: "/admin/gallery" },
  { key: "newBookings", label: "New bookings", href: "/admin/bookings?status=new" },
];

export default async function AdminHome() {
  const session = await requireRole(DASHBOARD_ROLES);
  const workshopFeatures = workshopFeaturesEnabled();
  const canEdit = CONTENT_ROLES.includes(session.role);

  // Stats and activity load independently: a failure in one never blanks the other.
  const [statsResult, activityResult] = await Promise.allSettled([
    getDashboardStats({ workshopFeatures }),
    getRecentActivity({ workshopFeatures }),
  ]);
  const stats = statsResult.status === "fulfilled" ? statsResult.value : null;
  if (statsResult.status === "rejected") logServerError("admin.dashboard.stats", statsResult.reason);
  let activity: ActivityItem[] | null = null;
  let activityNotConfigured = false;
  if (activityResult.status === "fulfilled") activity = activityResult.value;
  else if (isNotConfigured(activityResult.reason)) activityNotConfigured = true;
  else logServerError("admin.dashboard.activity", activityResult.reason);

  const cards = CARDS.filter((c) => c.key !== "newBookings" || workshopFeatures);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Signed in as ${session.email ?? session.uid} (${session.role}). Counts come straight from the database; there is no traffic analytics.`}
        action={
          canEdit && (
            <>
              <Link href="/admin/guides/new" className={primaryBtn}>New guide</Link>
              <Link href="/admin/videos/new" className={secondaryBtn}>Add video</Link>
            </>
          )
        }
      />

      {stats?.notConfigured ? (
        <EmptyState title="Firebase isn't connected here">Live data can&apos;t be loaded in this environment.</EmptyState>
      ) : (
        <section aria-label="Content overview" className="grid grid-cols-2 gap-space-sm md:grid-cols-4">
          {cards.map((c) => {
            const v = stats?.stats[c.key];
            return <StatCard key={c.key} label={c.label} value={v === null || v === undefined ? "—" : v} href={c.href} />;
          })}
        </section>
      )}
      {(statsResult.status === "rejected" || stats?.failed) && (
        <ErrorState retryHref="/admin">Some numbers couldn&apos;t be loaded (shown as —). The rest of the dashboard still works.</ErrorState>
      )}

      <div className="grid gap-space-lg lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className={`${cardClass} flex flex-col gap-space-md`} aria-labelledby="activity-h">
          <div className="flex items-center justify-between gap-space-sm">
            <h2 id="activity-h" className="font-headline text-headline-sm text-text-primary">Recent activity</h2>
            <Link href="/admin/activity" className="text-body-sm text-text-muted hover:text-text-primary">View all</Link>
          </div>
          {activityNotConfigured ? (
            <p className="text-body-sm text-text-muted">Activity can&apos;t be loaded in this environment.</p>
          ) : activity === null ? (
            <p role="alert" className="text-body-sm text-text-muted">
              Recent activity couldn&apos;t be loaded right now. <Link href="/admin" className="underline">Retry</Link>
            </p>
          ) : activity.length === 0 ? (
            <p className="text-body-sm text-text-muted">No activity yet. Publishing, editing and deleting content is recorded here.</p>
          ) : (
            <ol className="flex flex-col">
              {activity.map((item) => (
                <li
                  key={`${item.kind}-${item.kind === "booking" ? item.booking.id : item.entry.id}`}
                  className="flex flex-col gap-0.5 border-t border-border-subtle py-space-sm first:border-0 first:pt-0 sm:flex-row sm:items-baseline sm:gap-space-md"
                >
                  <time dateTime={item.at} className="shrink-0 font-code text-label-telemetry text-text-muted sm:w-36">
                    {new Date(item.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </time>
                  <span className="text-body-sm text-text-primary">{activityLine(item)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={`${cardClass} flex flex-col gap-space-sm`} aria-labelledby="howto-h">
          <h2 id="howto-h" className="font-headline text-headline-sm text-text-primary">Publishing a guide</h2>
          <ol className="list-decimal space-y-space-xs pl-space-lg text-body-sm text-text-muted">
            <li><Link href="/admin/guides/new" className="text-text-primary underline">Write a guide</Link> and save it as a draft.</li>
            <li>Tag categories, link fault codes and paste the YouTube URL.</li>
            <li>Press <strong className="text-text-primary">Publish</strong>: page, metadata, sitemap entry and related links are generated.</li>
            <li>Use <strong className="text-text-primary">Copy URL</strong> to put the guide link in the YouTube description.</li>
          </ol>
        </section>
      </div>
    </>
  );
}
