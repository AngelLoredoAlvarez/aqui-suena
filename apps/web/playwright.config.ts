import { defineConfig } from "@playwright/test";

// Locale coverage via two projects differing only by context locale
// (es-ES vs en-US): exercises the real detectWebLocale path with no
// committed state files and no UI clicks.
// localhost (not 127.0.0.1): Next 16 blocks cross-origin dev resources,
// so 127.0.0.1 serves SSR HTML without hydration/HMR and every
// interaction test fails. Port honors E2E_PORT so a run can reuse an
// already-running dev server (reuseExistingServer reuses when `url`
// answers); default is a dedicated 3100 to avoid clashing with a manual
// `pnpm dev` on 3000.
const E2E_PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm dev --port ${E2E_PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium-es",
      use: { locale: "es-ES" },
    },
    {
      name: "chromium-en",
      use: { locale: "en-US" },
    },
  ],
});
