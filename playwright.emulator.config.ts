import { generateKeyPairSync } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

/**
 * Admin content workflow against the Firebase EMULATORS (npm run test:admin-flow).
 * No real Firebase project is touched: the emulator hosts are injected by
 * `firebase emulators:exec`, and the service-account key below is a throwaway key
 * generated for this run (the emulators don't verify it).
 */
const PORT = 3300;
const PROJECT = "demo-autofixhub";
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

export default defineConfig({
  testDir: "tests/integration",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: [["list"]],
  outputDir: "test-results/integration",
  use: { baseURL: `http://localhost:${PORT}`, ...devices["Desktop Chrome"] },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATA_SOURCE: "firestore",
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
      BUSINESS_ID: "default",
      FIREBASE_ADMIN_PROJECT_ID: PROJECT,
      FIREBASE_ADMIN_CLIENT_EMAIL: `emulator@${PROJECT}.iam.gserviceaccount.com`,
      FIREBASE_ADMIN_PRIVATE_KEY: privateKey.replace(/\n/g, "\n"),
      NEXT_PUBLIC_FIREBASE_API_KEY: "emulator-api-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${PROJECT}.firebaseapp.com`,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJECT,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: `${PROJECT}.appspot.com`,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "0",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:0:web:0",
      FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080",
      FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099",
      // The browser login form talks to the Auth emulator too (src/lib/firebase/client.ts).
      NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099",
      SHOW_PLACEHOLDERS: "true",
      WORKSHOP_FEATURES_ENABLED: "false",
    },
  },
});
