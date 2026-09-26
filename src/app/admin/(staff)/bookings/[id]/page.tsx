import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { BOOKINGS_ROLES } from "@/lib/auth/permissions";
import { isNotConfigured } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import { getBookingAdmin, getBookingPhotoLinks } from "@/lib/admin/bookings";
import { digitsOnly } from "@/lib/validation/uk";
import { AnchorButton } from "@/components/ui/Button";
import { BookingStatusBadge, cardClass, EmptyState, PageHeader } from "../../../_components/ui";
import { BookingStatusForm } from "../BookingStatusForm";
import { BookingNoteForm } from "../BookingNoteForm";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({ params }: PageProps<"/admin/bookings/[id]">) {
  await requireRole(BOOKINGS_ROLES);
  const { id } = await params;

  let booking: Awaited<ReturnType<typeof getBookingAdmin>> = null;
  try {
    booking = await getBookingAdmin(id);
  } catch (err) {
    if (isNotConfigured(err)) {
      return (
        <div className="flex flex-col gap-space-lg">
          <PageHeader title="Booking" />
          <EmptyState>Firebase Admin is not configured in this environment.</EmptyState>
        </div>
      );
    }
    logServerError("admin.booking.detail", err, { id });
    throw err;
  }
  if (!booking) notFound();

  const photoLinks = await getBookingPhotoLinks(booking);
  const waNumber = digitsOnly(booking.customer.phone).replace(/^0/, "44");

  return (
    <div className="flex flex-col gap-space-xl">
      <Link href="/admin/bookings" className="text-body-sm text-text-muted hover:text-text-primary">
        ← All bookings
      </Link>
      <PageHeader
        title={`Booking ${booking.reference}`}
        action={<BookingStatusBadge status={booking.status} />}
      />

      <div className="grid gap-space-lg lg:grid-cols-2">
        <section className={`${cardClass} flex flex-col gap-space-sm`}>
          <h2 className="font-headline text-headline-sm text-text-primary">Customer</h2>
          <dl className="grid grid-cols-[6rem_1fr] gap-space-xs text-body-sm">
            <dt className="text-text-muted">Name</dt>
            <dd>{booking.customer.name}</dd>
            <dt className="text-text-muted">Phone</dt>
            <dd>{booking.customer.phone}</dd>
            <dt className="text-text-muted">Email</dt>
            <dd>{booking.customer.email}</dd>
          </dl>
          <div className="flex flex-wrap gap-space-sm pt-space-xs">
            <AnchorButton href={`tel:${booking.customer.phone}`} variant="secondary">Call</AnchorButton>
            <AnchorButton href={`mailto:${booking.customer.email}`} variant="secondary">Email</AnchorButton>
            <AnchorButton href={`https://wa.me/${waNumber}`} variant="secondary" target="_blank" rel="noreferrer">
              WhatsApp
            </AnchorButton>
          </div>
        </section>

        <section className={`${cardClass} flex flex-col gap-space-sm`}>
          <h2 className="font-headline text-headline-sm text-text-primary">Vehicle &amp; service</h2>
          <dl className="grid grid-cols-[8rem_1fr] gap-space-xs text-body-sm">
            <dt className="text-text-muted">Registration</dt>
            <dd className="font-code">{booking.vehicle.vrm}</dd>
            <dt className="text-text-muted">Make / model</dt>
            <dd>{booking.vehicle.make} {booking.vehicle.model}</dd>
            <dt className="text-text-muted">Service</dt>
            <dd>{booking.serviceSnapshot.name} ({booking.serviceSnapshot.categoryName})</dd>
            <dt className="text-text-muted">Preferred date</dt>
            <dd>{booking.preferred.date} — {booking.preferred.timeWindow}</dd>
          </dl>
        </section>
      </div>

      <section className={`${cardClass} flex flex-col gap-space-sm`}>
        <h2 className="font-headline text-headline-sm text-text-primary">Reported symptoms</h2>
        <p className="whitespace-pre-wrap text-body-sm text-text-primary">{booking.symptoms}</p>
        {booking.photos.length > 0 &&
          (photoLinks && photoLinks.length > 0 ? (
            <ul className="flex flex-wrap gap-space-sm" aria-label="Customer photos">
              {photoLinks.map((p, i) => (
                <li key={p.url}>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed Storage URL */}
                    <img
                      src={p.url}
                      alt={`Customer photo ${i + 1}`}
                      loading="lazy"
                      className="h-28 w-28 rounded border border-border-subtle object-cover"
                    />
                  </a>
                </li>
              ))}
              <li className="self-end font-code text-label-telemetry text-text-muted">Links expire after 15 minutes.</li>
            </ul>
          ) : (
            <p className="font-code text-body-sm text-text-muted">
              {booking.photos.length} photo{booking.photos.length === 1 ? "" : "s"} attached in Storage
              (booking-uploads/{booking.id}/){photoLinks === null ? " — previews could not be loaded." : "."}
            </p>
          ))}
      </section>

      <section className={`${cardClass} flex flex-col gap-space-md`}>
        <h2 className="font-headline text-headline-sm text-text-primary">Status</h2>
        <BookingStatusForm id={booking.id} current={booking.status} />
      </section>

      <section className={`${cardClass} flex flex-col gap-space-md`}>
        <h2 className="font-headline text-headline-sm text-text-primary">Internal notes</h2>
        {booking.notes.length === 0 ? (
          <p className="text-body-sm text-text-muted">No notes yet.</p>
        ) : (
          <ul className="flex flex-col gap-space-sm">
            {[...booking.notes].reverse().map((n) => (
              <li key={n.id} className="border-b border-border-subtle pb-space-sm text-body-sm last:border-0">
                <p className="whitespace-pre-wrap text-text-primary">{n.text}</p>
                <p className="font-code text-label-telemetry text-text-muted">
                  {n.authorEmail ?? n.authorUid} · {new Date(n.at).toLocaleString("en-GB")}
                </p>
              </li>
            ))}
          </ul>
        )}
        <BookingNoteForm id={booking.id} />
      </section>
    </div>
  );
}
