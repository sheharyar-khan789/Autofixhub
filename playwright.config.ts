import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  outputDir: "test-results",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 820, height: 1180 }, hasTouch: true } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    // Fixture data: fictional, in-memory, refused in production builds.
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATA_SOURCE: "memory",
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
      SHOW_PLACEHOLDERS: "true",
      // Hermetic: never talk to a real Firebase project from a developer's .env.local
      // (process env takes precedence over .env files in Next.js).
      NEXT_PUBLIC_FIREBASE_API_KEY: "",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "",
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "",
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "",
      NEXT_PUBLIC_FIREBASE_APP_ID: "",
      FIREBASE_ADMIN_PROJECT_ID: "",
      FIREBASE_ADMIN_CLIENT_EMAIL: "",
      FIREBASE_ADMIN_PRIVATE_KEY: "",
      // Dormant workshop features stay off (as in production) unless explicitly requested.
      WORKSHOP_FEATURES_ENABLED: process.env.WORKSHOP_FEATURES_ENABLED ?? "false",
    },
  },
});
