import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-config-next doesn't extend eslint:recommended, so plain
    // JS-correctness rules like this one are off by default -- found the
    // hard way when a second "The Anarchy" entry in known-collisions.ts
    // silently overwrote the first (JS object literals keep only the last
    // duplicate key, with no error). That file grows by hand across dozens
    // of audits, so this is exactly the kind of mistake that needs a lint
    // rule instead of relying on catching it by eye every time.
    rules: { "no-dupe-keys": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
