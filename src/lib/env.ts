import "server-only";

/**
 * Server environment access. Nothing here is exposed to the browser.
 * Values are read lazily so `next build` succeeds without credentials; code
 * that needs Firebase surfaces a typed error instead of crashing the build.
 */

export class FirebaseNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(`Firebase Admin is not configured. Missing: ${missing.join(", ")}`);
    this.name = "FirebaseNotConfiguredError";
  }
}

/**
 * `instanceof` is unreliable across Next.js server bundle layers (RSC/SSR/route
 * handlers can each get their own copy of this module), so match by name.
 */
export function isNotConfigured(err: unknown): boolean {
  return err instanceof Error && err.name === "FirebaseNotConfiguredError";
}

export function businessId(): string {
  return process.env.BUSINESS_ID?.trim() || "default";
}

/**
 * Canonical site origin (sitemap, canonical URLs, JSON-LD). NEXT_PUBLIC_SITE_URL
 * should always be set for production; if it's missing on Vercel, fall back to the
 * project's production domain rather than emitting localhost URLs to search engines.
 */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProd) return `https://${vercelProd.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}

/**
 * AutoFixHub is a knowledge platform; the original workshop features (public booking
 * form + API, the services catalogue, and the admin Bookings/Services/Reviews areas)
 * are kept in the codebase but dormant unless this is exactly "true". While off,
 * /book and /services redirect (next.config.ts) and POST /api/bookings returns 404.
 */
export function workshopFeaturesEnabled(): boolean {
  return process.env.WORKSHOP_FEATURES_ENABLED === "true";
}

/** Placeholder sections are shown unless explicitly disabled at launch. */
export function showPlaceholders(): boolean {
  return process.env.SHOW_PLACEHOLDERS !== "false";
}

export type DataSourceKind = "firestore" | "memory";

/**
 * `memory` is a development/test fixture only. It is refused in production so
 * fixture data can never be served as real business data.
 */
export function dataSource(): DataSourceKind {
  const v = process.env.DATA_SOURCE?.trim() || "firestore";
  if (v === "memory") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATA_SOURCE=memory is not permitted in production builds.");
    }
    return "memory";
  }
  return "firestore";
}

export interface AdminCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  storageBucket: string;
}

export function readAdminCredentials(): AdminCredentials {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  const missing: string[] = [];
  if (!projectId) missing.push("FIREBASE_ADMIN_PROJECT_ID");
  if (!clientEmail) missing.push("FIREBASE_ADMIN_CLIENT_EMAIL");
  if (!privateKey) missing.push("FIREBASE_ADMIN_PRIVATE_KEY");
  if (!storageBucket) missing.push("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  if (missing.length) throw new FirebaseNotConfiguredError(missing);
  return {
    projectId: projectId!,
    clientEmail: clientEmail!,
    // Vercel/.env store the key with literal \n sequences
    privateKey: privateKey!.replace(/\\n/g, "\n"),
    storageBucket: storageBucket!,
  };
}

/**
 * Salt for hashing client IPs. Required in production: with the public dev
 * default, the whole IPv4 space could be hashed and stored hashes reversed.
 * A missing salt surfaces as "not configured" (booking API → 503), never silently.
 */
export function ipHashSalt(): string {
  const salt = process.env.IP_HASH_SALT?.trim();
  if (salt) return salt;
  if (process.env.NODE_ENV === "production") throw new FirebaseNotConfiguredError(["IP_HASH_SALT"]);
  return "dev-only-salt-change-me";
}
