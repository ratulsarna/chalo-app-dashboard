import { defineConfig } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
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
    // Use a production server for stable hydration (avoid dev/HMR flakiness and Next dev lock).
    command: `pnpm build && pnpm exec next start -p ${port}`,
    url: baseURL,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
