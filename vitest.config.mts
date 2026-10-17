import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": resolve(import.meta.dirname, "src") } },
  test: { include: ["tests/unit/**/*.test.ts", "tests/component/**/*.test.tsx"], environment: "node" },
});
