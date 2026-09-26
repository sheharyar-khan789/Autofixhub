"use client";

import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getClientAuth, isClientFirebaseConfigured } from "@/lib/firebase/client";

type Status = "idle" | "submitting" | "redirecting" | "error";

/** Every step has a deadline, so "Signing in…" can never spin forever. */
const STEP_TIMEOUT_MS = 20_000;

class TimeoutError extends Error {
  constructor() {
    super("timeout");
    this.name = "TimeoutError";
  }
}

function withTimeout<T>(p: Promise<T>, ms = STEP_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new TimeoutError()), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export function LoginForm({ next = "/admin" }: { next?: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const configured = isClientFirebaseConfigured();
  const busy = status === "submitting" || status === "redirecting";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!email || !password) {
      setStatus("error");
      setMessage("Enter your email and password.");
      return;
    }
    setStatus("submitting");
    setMessage(null);
    try {
      const auth = await getClientAuth();
      const cred = await withTimeout(signInWithEmailAndPassword(auth, email, password));
      const idToken = await withTimeout(cred.user.getIdToken());
      const controller = new AbortController();
      const abort = setTimeout(() => controller.abort(), STEP_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(abort);
        // The httpOnly cookie is the only credential we keep; drop the in-memory client session.
        await signOut(auth).catch(() => undefined);
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        setStatus("error");
        setMessage(data?.message ?? "Sign in failed. Try again.");
        return;
      }
      setStatus("redirecting");
      router.replace(next);
      router.refresh();
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      setStatus("error");
      if (err instanceof TimeoutError || (err as Error).name === "AbortError") {
        setMessage("Signing in is taking too long. Check your connection and try again.");
      } else if (code === "auth/too-many-requests") {
        setMessage("Too many attempts. Wait a few minutes and try again.");
      } else if (code === "auth/network-request-failed") {
        setMessage("Could not reach the sign-in service. Check your connection and try again.");
      } else if (code.startsWith("auth/")) {
        // One message for wrong email / wrong password / unknown user: no account enumeration.
        setMessage("Email or password is incorrect.");
      } else {
        setMessage("Could not sign in. Try again.");
      }
    }
  }

  if (!configured) {
    return (
      <div role="alert" className="rounded border border-status-amber-warning bg-surface-raised p-space-md text-body-md text-text-muted">
        Firebase is not configured for this environment (missing NEXT_PUBLIC_FIREBASE_* variables), so sign-in is disabled.
      </div>
    );
  }

  const field =
    "w-full rounded border border-border-medium bg-surface-container-lowest px-space-md py-space-sm text-body-md text-text-primary transition-colors focus:border-text-primary disabled:opacity-60";
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-space-md" noValidate aria-busy={busy}>
      {message && (
        <p role="alert" className="flex items-start gap-space-xs rounded border border-status-fault-red/50 bg-status-fault-red/10 px-space-md py-space-sm text-body-sm text-text-primary">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-fault-red" aria-hidden="true" /> {message}
        </p>
      )}
      <label className="flex flex-col gap-space-xs text-body-sm font-semibold text-text-primary">
        Email
        <input name="email" type="email" autoComplete="username" className={field} required disabled={busy} />
      </label>
      <label className="flex flex-col gap-space-xs text-body-sm font-semibold text-text-primary">
        Password
        <input name="password" type="password" autoComplete="current-password" className={field} required disabled={busy} />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="mt-space-xs inline-flex min-h-11 items-center justify-center gap-space-sm rounded bg-primary-container px-space-lg py-space-md font-headline text-body-md font-bold uppercase tracking-wider text-text-primary transition-colors hover:bg-accent-red-hover disabled:opacity-70"
      >
        {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
        {status === "submitting" ? "Signing in…" : status === "redirecting" ? "Opening dashboard…" : "Sign in"}
      </button>
    </form>
  );
}
