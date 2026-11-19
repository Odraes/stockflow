import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// eslint-config-next v16 ships native "flat config" arrays, so we no longer
// need the FlatCompat bridge from @eslint/eslintrc.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Generated output — never lint these.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
