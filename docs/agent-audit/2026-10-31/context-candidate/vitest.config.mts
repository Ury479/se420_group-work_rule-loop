import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
// Do not load RuleLoop's .env.test or tests/setup.ts.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: { alias: { "@": fileURLToPath(new URL("../../../../src", import.meta.url)) } },
  test: { environment: "node", include: ["tests/*.test.ts"], fileParallelism: false, testTimeout: 15000, hookTimeout: 15000 },
});
