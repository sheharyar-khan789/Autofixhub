import { requireRole } from "@/lib/auth/session";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { DASHBOARD_ROLES } from "@/lib/auth/permissions";
import { businessId } from "@/lib/env";
import { PageHeader, cardClass } from "../../_components/ui";
import { PasswordResetButton } from "./PasswordResetButton";

export const dynamic = "force-dynamic";

const ROLE_HELP: Record<string, string> = {
  owner: "Full access: content, settings and the activity log.",
  manager: "Content, settings and the activity log.",
  editor: "Guides, videos, fault codes, categories, media and SEO.",
  technician: "Dashboard only (plus bookings if workshop features are enabled).",
};

export default async function AccountPage() {
  const session = await requireRole(DASHBOARD_ROLES);
  const rows: [string, string][] = [
    ["Email", session.email ?? "—"],
    ["Role", session.role],
    ["Business", businessId()],
    ["User ID", session.uid],
  ];
  return (
    <>
      <PageHeader title="Account" breadcrumbs={[{ name: "Dashboard", href: "/admin" }, { name: "Account" }]} />
      <section className={`${cardClass} flex flex-col gap-space-md`} aria-labelledby="acct-h">
        <h2 id="acct-h" className="font-headline text-headline-sm text-text-primary">Your access</h2>
        <dl className="grid gap-x-space-lg gap-y-space-sm text-body-sm sm:grid-cols-[10rem_1fr]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-text-muted">{k}</dt>
              <dd className="break-all font-code text-text-primary">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-body-sm text-text-muted">{ROLE_HELP[session.role]}</p>
      </section>
      <section className={`${cardClass} flex flex-col gap-space-sm`} aria-labelledby="sec-h">
        <h2 id="sec-h" className="font-headline text-headline-sm text-text-primary">Security</h2>
        <ul className="list-disc space-y-space-xs pl-space-lg text-body-sm text-text-muted">
          <li>Sessions last {SESSION_MAX_AGE_SECONDS / 3600} hours. Signing out ends the session on the server too.</li>
          <li>Roles are granted by the site owner (<code className="font-code">npm run admin:grant</code>); they can&apos;t be changed from here.</li>
        </ul>
        {session.email && <PasswordResetButton email={session.email} />}
      </section>
    </>
  );
}
