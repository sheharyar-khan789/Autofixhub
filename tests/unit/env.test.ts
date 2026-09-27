import { afterEach, describe, expect, it, vi } from "vitest";
import { dataSource, googleSiteVerification, ipHashSalt, siteUrl, isNotConfigured, readAdminCredentials, FirebaseNotConfiguredError, showPlaceholders } from "@/lib/env";
import { metaDescription } from "@/lib/seo";

afterEach(() => vi.unstubAllEnvs());

describe("env safeguards", () => {
  it("refuses the in-memory fixture data source in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATA_SOURCE", "memory");
    expect(() => dataSource()).toThrow(/not permitted in production/);
  });
  it("allows the fixture outside production and defaults to firestore", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATA_SOURCE", "memory");
    expect(dataSource()).toBe("memory");
    vi.stubEnv("DATA_SOURCE", "");
    expect(dataSource()).toBe("firestore");
  });
  it("reports every missing Firebase Admin variable by name, never a value", () => {
    for (const k of ["FIREBASE_ADMIN_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"]) vi.stubEnv(k, "");
    try {
      readAdminCredentials();
      expect.unreachable();
    } catch (e) {
      expect(isNotConfigured(e)).toBe(true);
      expect(e).toBeInstanceOf(FirebaseNotConfiguredError);
      expect((e as Error).message).toContain("FIREBASE_ADMIN_PRIVATE_KEY");
    }
  });
  it("requires IP_HASH_SALT in production instead of using the public dev salt", () => {
    vi.stubEnv("IP_HASH_SALT", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(ipHashSalt()).toBe("dev-only-salt-change-me");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => ipHashSalt()).toThrow(/IP_HASH_SALT/);
    vi.stubEnv("IP_HASH_SALT", "a-real-random-salt");
    expect(ipHashSalt()).toBe("a-real-random-salt");
  });
  it("site URL: explicit value wins, then the Vercel production domain, never a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.co.uk/");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "workshop.vercel.app");
    expect(siteUrl()).toBe("https://example.co.uk");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(siteUrl()).toBe("https://workshop.vercel.app");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(siteUrl()).toBe("http://localhost:3000");
  });
  it("a Vercel production deployment never publishes a localhost or http site URL", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "autofixhub.vercel.app");
    for (const bad of ["http://localhost:3000", "http://127.0.0.1:3000", "http://autofixhub.co.uk", "not a url"]) {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", bad);
      expect(siteUrl(), bad).toBe("https://autofixhub.vercel.app");
    }
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://autofixhub.co.uk/");
    expect(siteUrl()).toBe("https://autofixhub.co.uk");
    // Local builds and preview deployments keep whatever is configured.
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    expect(siteUrl()).toBe("http://localhost:3000");
  });
  it("Search Console verification token: from the value or a pasted meta tag; absent when unset", () => {
    vi.stubEnv("GOOGLE_SITE_VERIFICATION", "");
    expect(googleSiteVerification()).toBeUndefined();
    vi.stubEnv("GOOGLE_SITE_VERIFICATION", " abc123-XYZ ");
    expect(googleSiteVerification()).toBe("abc123-XYZ");
    vi.stubEnv("GOOGLE_SITE_VERIFICATION", '<meta name="google-site-verification" content="abc123-XYZ" />');
    expect(googleSiteVerification()).toBe("abc123-XYZ");
  });
  it("meta descriptions: one line, no hashtags, cut at a word near 155 characters", () => {
    expect(metaDescription("Short text.\r\n#Shorts #P0420")).toBe("Short text.");
    const long = metaDescription("Getting fault codes P268111 and P268172?\r\n" + "This short highlights a coolant bypass valve circuit fault. ".repeat(5));
    expect(long.length).toBeLessThanOrEqual(155);
    expect(long).toMatch(/\w…$/);
    expect(long).not.toMatch(/[\r\n]/);
  });
  it("placeholders are on unless explicitly disabled", () => {
    vi.stubEnv("SHOW_PLACEHOLDERS", "");
    expect(showPlaceholders()).toBe(true);
    vi.stubEnv("SHOW_PLACEHOLDERS", "false");
    expect(showPlaceholders()).toBe(false);
  });
});
