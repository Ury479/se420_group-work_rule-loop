import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    ".upgrade/**",
    ".local/**",
    "docs/**",
    "test-results/**",
    "playwright-report/**",
    "node_modules/**",
    "**/guizang-ppt-skill/**",
    "v0_memories/**",
  ]),
]);
