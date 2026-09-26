import "server-only";
import { createHash } from "node:crypto";
import { ipHashSalt, siteUrl } from "@/lib/env";

/**
 * CSRF defence for cookie-authenticated or state-changing JSON/multipart POSTs:
 * the Origin header (sent by browsers on cross-site and same-site POSTs) must
 * match this site. Requests with no Origin (curl, server-to-server) are rejected.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  let o: URL;
  try {
    o = new URL(origin);
  } catch {
    return false;
  }
  const allowed = new Set<string>([new URL(siteUrl()).origin]);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? (o.protocol === "https:" ? "https" : "http");
    allowed.add(`${proto}://${host}`);
  }
  return allowed.has(o.origin);
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Salted hash so abuse can be limited without storing raw IPs. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${ipHashSalt()}:${ip}`).digest("hex").slice(0, 32);
}
