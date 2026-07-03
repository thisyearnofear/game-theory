import { defineConfig, devices } from "@playwright/test";

/**
 * Capture-only Playwright config for HyperFrames demo footage.
 *
 * This is NOT a test config — it drives the app end-to-end and records WebM
 * video of each segment. Wallet-gated actions (Freighter sign popups) are
 * skipped and covered later with HyperFrames overlays.
 *
 * Run:
 *   npm run dev   # in a separate terminal — vite on :5173
 *   npx playwright test --project=demo-capture
 *
 * Output:
 *   e2e/demo-footage/<segment>/video.webm
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  outputDir: "./e2e/demo-footage",

  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:5173",
    trace: "off",
    video: {
      mode: "on",
      size: { width: 1920, height: 1080 },
    },
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // retina — sharper text in the render
    screenshot: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "demo-capture",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
