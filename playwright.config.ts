import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const reuseExistingServer = process.env.E2E_REUSE_SERVER === "1";
const port = (() => {
  try {
    const url = new URL(baseURL);
    const parsed = Number(url.port);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 3000;
  } catch {
    return 3000;
  }
})();

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm dev --port ${port}`,
    url: baseURL,
    // Prefer a clean server per run; set E2E_REUSE_SERVER=1 to reuse an existing dev server.
    reuseExistingServer,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
