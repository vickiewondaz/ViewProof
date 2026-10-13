import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE ?? "http://localhost:4100",
  },
  webServer: process.env.E2E_BASE
    ? undefined
    : {
        command: "npx next start -p 4100",
        port: 4100,
        timeout: 120_000,
        reuseExistingServer: true,
        // Prod sets real values on Netlify; e2e only needs auth to behave
        // (401s, not 500s) on unauthenticated paths.
        env: {
          BETTER_AUTH_SECRET: "e2e-dummy-secret-0123456789abcdef",
          BETTER_AUTH_URL: "http://localhost:4100",
        },
      },
});
