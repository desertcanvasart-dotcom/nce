import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/** API-level database tests; need `supabase start` (run in the CI database job). */
export default defineConfig({
  resolve: { alias: { "@": resolve(import.meta.dirname, "src") } },
  // One file at a time: the concurrency test publishes a sample sailing that the REST test must not see.
  test: { include: ["tests/db-api/**/*.test.ts"], environment: "node", testTimeout: 20000, fileParallelism: false },
});
