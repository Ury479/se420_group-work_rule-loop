import { defineConfig } from "@playwright/test";
process.loadEnvFile(".env.test");
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  expect: { timeout: 10000 },
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  use: {
    baseURL: "http://localhost:3102",
    headless: true,
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  globalSetup: "./tests/e2e/setup.ts",
  webServer: {
    command:
      "node --env-file=.env.test node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3102",
    url: "http://localhost:3102/sign-in",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
