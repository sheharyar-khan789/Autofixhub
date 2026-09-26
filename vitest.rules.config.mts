import { defineConfig } from "vitest/config";

// Runs only under the Firebase emulator: npm run test:rules
export default defineConfig({
  test: { environment: "node", include: ["tests/rules/**/*.test.ts"], testTimeout: 30_000, hookTimeout: 30_000 },
});
