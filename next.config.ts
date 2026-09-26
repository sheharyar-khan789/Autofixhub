import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";
const authEmulator = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;

/**
 * Content-Security-Policy for what the site actually uses:
 * - scripts/styles/fonts from this origin ('unsafe-inline' is required for Next.js's
 *   inline hydration scripts without per-request nonces, which would force every page
 *   to render dynamically and lose static caching);
 * - Firebase Auth REST endpoints for staff sign-in (+ the Auth emulator in tests);
 * - YouTube (no-cookie) as the only framed content; https images (YouTube thumbnails,
 *   Firebase Storage media);
 * - nothing may frame this site, no plugins, forms only post back to this origin.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
    dev ? "ws: wss:" : "",
    authEmulator ? `http://${authEmulator}` : "",
  ].filter(Boolean).join(" "),
  "frame-src https://www.youtube-nocookie.com",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

/** Mirrors workshopFeaturesEnabled() in src/lib/env.ts (read at build time here). */
const workshopFeatures = process.env.WORKSHOP_FEATURES_ENABLED === "true";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    // AutoFixHub is a knowledge platform: the old booking and services routes point to
    // their knowledge-platform equivalents instead of 404ing (see README).
    if (workshopFeatures) return [];
    return [
      { source: "/book", destination: "/contact", permanent: true },
      { source: "/services", destination: "/categories", permanent: true },
      { source: "/services/:slug*", destination: "/categories", permanent: true },
    ];
  },
};

export default nextConfig;
