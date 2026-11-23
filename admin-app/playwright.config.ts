import { defineConfig } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const missingCredentials = [
  "E2E_USER_EMAIL",
  "E2E_USER_PASSWORD",
  "E2E_ADMIN_EMAIL",
  "E2E_ADMIN_PASSWORD",
].filter((name) => !process.env[name]?.trim());

if (missingCredentials.length) {
  console.info(`Skipping affected authenticated Playwright tests. Missing: ${missingCredentials.join(", ")}`);
}

export default defineConfig({
  use: { baseURL: "http://localhost:3000" },
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
