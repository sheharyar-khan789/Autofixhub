import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { BOOKINGS_ROLES } from "@/lib/auth/permissions";
import { isNotConfigured } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import { listBookingsAdmin } from "@/lib/admin/bookings";
import { BOOKING_STATUSES, BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/models";
import { BookingStatusBadge, EmptyState, inputClass, PageHeader, tableWrapClass, tdClass, thClass, trClass } from "../../_components/ui";

export const dynamic = "force-dynamic";

function isBookingStatus(v: unknown): v is BookingStatus {
  return typeof v === "string" && (BOOKING_STATUSES as readonly string[]).includes(v);
}

export default async function BookingsPage({ searchParams }: PageProps<"/admin/bookings">) {
  await requireRole(BOOKINGS_ROLES);
  const sp = await searchParams;
  const statusParam = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const status = isBookingStatus(statusParam) ? statusParam : undefined;
  const qParam = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = typeof qParam === "string" ? qParam : "";

  let bookings: Awaited<ReturnType<typeof listBookingsAdmin>> = [];
  let unavailable = false;
  try {
    bookings = await listBookingsAdmin({ status, q: q || undefined });
  } catch (err) {
    if (isNotConfigured(err)) unavailable = true;
    else logServerError("admin.bookings.list", err);
  }

  return (
    <div className="flex flex-col gap-space-lg">
      <PageHeader title="Bookings" />

      <form className="flex flex-wrap items-end gap-space-md" method="get">
        <label className="flex flex-col gap-space-xs font-code text-label-code text-text-muted">
          Status
          <select name="status" defaultValue={status ?? ""} className={inputClass}>
            <option value="">All statuses</option>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {BOOKING_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 min-w-[12rem] flex-col gap-space-xs font-code text-label-code text-text-muted">
          Search
          <input name="q" defaultValue={q} placeholder="Reference, name, phone, VRM…" className={inputClass} />
        </label>
        <button type="submit" className="rounded border border-border-medium px-space-md py-space-sm text-body-sm text-text-primary hover:border-text-muted">
          Filter
        </button>
        {(status || q) && (
          <Link href="/admin/bookings" className="text-body-sm text-text-muted hover:text-text-primary">
            Clear
          </Link>
        )}
      </form>

      {unavailable ? (
        <EmptyState>Firebase Admin is not configured in this environment, so bookings can&apos;t be loaded.</EmptyState>
      ) : bookings.length === 0 ? (
        <EmptyState>No bookings match this filter.</EmptyState>
      ) : (
        <div className={tableWrapClass}>
          <table className="w-full min-w-[48rem] border-collapse">
            <thead>
              <tr>
                <th className={thClass}>Reference</th>
                <th className={thClass}>Customer</th>
                <th className={thClass}>Vehicle</th>
                <th className={thClass}>Service</th>
                <th className={thClass}>Preferred</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Received</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className={trClass}>
                  <td className={tdClass}>
                    <Link href={`/admin/bookings/${b.id}`} className="font-code font-semibold text-text-primary hover:underline">
                      {b.reference}
                    </Link>
                  </td>
                  <td className={tdClass}>
                    {b.customer.name}
                    <div className="text-text-muted">{b.customer.phone}</div>
                  </td>
                  <td className={tdClass}>
                    {b.vehicle.vrm}
                    <div className="text-text-muted">
                      {b.vehicle.make} {b.vehicle.model}
                    </div>
                  </td>
                  <td className={tdClass}>{b.serviceSnapshot.name}</td>
                  <td className={tdClass}>{b.preferred.date}</td>
                  <td className={tdClass}>
                    <BookingStatusBadge status={b.status} />
                  </td>
                  <td className={`${tdClass} text-text-muted`}>{new Date(b.createdAt).toLocaleDateString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
