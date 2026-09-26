import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { safeAdminNext } from "@/lib/auth/roles";
import { getStaffSession } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Staff sign in", robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { next: rawNext, reason } = await searchParams;
  const next = safeAdminNext(rawNext);
  // Already signed in with a valid staff session: skip the form entirely.
  if (await getStaffSession()) redirect(next);

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-gutter py-space-xl">
      <div className="w-full max-w-md rounded-lg border border-border-medium bg-surface-card p-space-lg shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)] sm:p-space-xl">
        <div className="mb-space-lg flex flex-col gap-space-md">
          <Logo showTagline={false} />
          <div>
            <h1 className="font-headline text-headline-md text-text-primary">Staff sign in</h1>
            <p className="mt-space-xs text-body-sm text-text-muted">Manage guides, fault codes, videos and categories.</p>
          </div>
        </div>
        {reason === "expired" && (
          <p role="status" className="mb-space-md rounded border border-status-amber-warning/60 bg-status-amber-warning/10 px-space-md py-space-sm text-body-sm text-text-primary">
            Your session has ended. Sign in again to continue.
          </p>
        )}
        <LoginForm next={next} />
      </div>
    </main>
  );
}
