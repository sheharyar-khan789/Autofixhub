import { requireRole } from "@/lib/auth/session";
import { SETTINGS_ROLES } from "@/lib/auth/permissions";
import { isNotConfigured } from "@/lib/env";
import { logServerError } from "@/lib/logger";
import { getSettingsAdmin } from "@/lib/admin/settings";
import type { BusinessSettings } from "@/lib/models";
import { EmptyState, PageHeader } from "../../_components/ui";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireRole(SETTINGS_ROLES);
  let settings: BusinessSettings | null = null;
  let unavailable = false;
  try {
    settings = await getSettingsAdmin();
  } catch (err) {
    if (isNotConfigured(err)) unavailable = true;
    else logServerError("admin.settings.page", err);
  }

  return (
    <div className="flex flex-col gap-space-lg">
      <PageHeader title="Settings" description="Business details shown on the website. Leave anything unconfirmed empty: empty fields are hidden, never invented." breadcrumbs={[{ name: "Dashboard", href: "/admin" }, { name: "Settings" }]} />
      <p className="text-body-sm text-text-muted">
        These values feed the public site directly — nothing here is hardcoded elsewhere in the frontend.
      </p>
      {unavailable && <EmptyState>Firebase Admin is not configured in this environment.</EmptyState>}
      <SettingsForm settings={settings} />
    </div>
  );
}
