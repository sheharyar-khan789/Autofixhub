import { Suspense } from "react";
import { requireRole } from "@/lib/auth/session";
import { DASHBOARD_ROLES } from "@/lib/auth/permissions";
import { workshopFeaturesEnabled } from "@/lib/env";
import { AdminShell } from "../_components/AdminShell";
import { FlashToast } from "../_components/FlashToast";
import { navFor } from "../_components/nav";

/**
 * Staff area. Authorisation is decided on the server BEFORE anything renders: an
 * unauthenticated or non-staff request is redirected by requireRole(), so protected
 * content never flashes and there is no client-side auth state to get stuck in.
 */
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(DASHBOARD_ROLES);
  return (
    <AdminShell groups={navFor(session.role, workshopFeaturesEnabled())} email={session.email ?? session.uid} role={session.role}>
      {children}
      <Suspense fallback={null}>
        <FlashToast />
      </Suspense>
    </AdminShell>
  );
}
