import { defineConfig } from "vitest/config";

// Unit tests cover pure modules only (settings, model, layout), so a plain
// Node environment is enough. Obsidian itself is never imported in tests.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
