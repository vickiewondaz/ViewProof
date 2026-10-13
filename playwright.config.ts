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
      },
});
