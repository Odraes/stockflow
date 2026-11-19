import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for pure logic (validation, parsing, CSV, time zones, permissions).
 * Database behaviour is tested separately in supabase/tests/database_tests.sql.
 */
export default defineConfig({
  resolve: {
    // Same "@/..." import paths as the app (see tsconfig.json).
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
