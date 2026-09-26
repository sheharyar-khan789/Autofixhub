import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { CONTENT_ROLES } from "@/lib/auth/permissions";
import { isNotConfigured } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import { listAllAdmin, servicesConfig } from "@/lib/admin/content";
import {
  EmptyState,
  PageHeader,
  PublishBadge,
  secondaryBtn,
  tableWrapClass,
  tdClass,
  thClass,
  trClass,
} from "../../_components/ui";
import { setServiceStatusAction } from "./actions";
import { DeleteServiceButton } from "./DeleteServiceButton";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  await requireRole(CONTENT_ROLES);
  let services: Awaited<ReturnType<typeof listAllAdmin<import("@/lib/models").Service>>> = [];
  let unavailable = false;
  try {
    services = await listAllAdmin(servicesConfig);
  } catch (err) {
    if (isNotConfigured(err)) unavailable = true;
    else logServerError("admin.services.list", err);
  }
  services = [...services].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-space-lg">
      <PageHeader title="Services" action={<Link href="/admin/services/new" className={secondaryBtn}>New service</Link>} />

      {unavailable ? (
        <EmptyState>Firebase Admin is not configured in this environment.</EmptyState>
      ) : services.length === 0 ? (
        <EmptyState>No services yet. Create the first one.</EmptyState>
      ) : (
        <div className={tableWrapClass}>
          <table className="w-full min-w-[44rem] border-collapse">
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Price</th>
                <th className={thClass}>Bookable</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className={trClass}>
                  <td className={tdClass}>
                    <Link href={`/admin/services/${s.id}`} className="font-semibold text-text-primary hover:underline">
                      {s.name}
                    </Link>
                    <div className="font-code text-text-muted">/{s.slug}</div>
                  </td>
                  <td className={tdClass}>
                    {s.priceMode === "quote"
                      ? "Quote on inspection"
                      : s.pricePence != null
                        ? `${s.priceMode === "from" ? "From " : ""}£${(s.pricePence / 100).toFixed(2)}`
                        : "—"}
                  </td>
                  <td className={tdClass}>{s.bookable ? "Yes" : "No"}</td>
                  <td className={tdClass}>
                    <PublishBadge status={s.status} />
                  </td>
                  <td className={tdClass}>
                    <div className="flex flex-wrap gap-space-xs">
                      {s.status === "published" ? (
                        <form action={setServiceStatusAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="status" value="draft" />
                          <button type="submit" className="text-body-sm text-text-muted hover:text-text-primary">
                            Unpublish
                          </button>
                        </form>
                      ) : (
                        <form action={setServiceStatusAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="status" value="published" />
                          <button type="submit" className="text-body-sm text-status-pass-green hover:underline">
                            Publish
                          </button>
                        </form>
                      )}
                      <DeleteServiceButton id={s.id} name={s.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
