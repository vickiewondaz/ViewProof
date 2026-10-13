import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit only — Playwright owns e2e/ (run with `npm run test:e2e`).
    exclude: ["e2e/**", "node_modules/**", "test-results/**", ".next/**"],
  },
});
