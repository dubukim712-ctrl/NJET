import { defineConfig } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const releaseVerification = process.env.E2E_RELEASE === "1";
const missingCredentials = [
  "E2E_USER_EMAIL",
  "E2E_USER_PASSWORD",
  "E2E_ADMIN_EMAIL",
  "E2E_ADMIN_PASSWORD",
  ...(releaseVerification ? [
    "E2E_STAFF_EMAIL", "E2E_STAFF_PASSWORD", "E2E_WRONG_STAFF_EMAIL", "E2E_WRONG_STAFF_PASSWORD",
    "E2E_OTHER_USER_EMAIL", "E2E_OTHER_USER_PASSWORD",
    "E2E_RELEASE_APPOINTMENT_ID", "E2E_RELEASE_CUSTOMER_ID",
  ] : []),
].filter((name) => !process.env[name]?.trim());

if (releaseVerification) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(supabaseUrl).hostname)) {
    throw new Error('Warranty release verification requires disposable local Supabase.');
  }
}
if (releaseVerification && missingCredentials.length) {
  throw new Error(`Missing release test fixtures: ${missingCredentials.join(", ")}`);
}
if (missingCredentials.length) {
  console.info(`Skipping affected authenticated Playwright tests. Missing: ${missingCredentials.join(", ")}`);
}

export default defineConfig({
  workers: 1,
  reporter: process.env.CI ? [["list"], ["json", { outputFile: "test-results/playwright.json" }]] : "list",
  use: { baseURL: "http://localhost:3000" },
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
