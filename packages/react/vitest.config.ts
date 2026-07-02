import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    passWithNoTests: true,
    typecheck: { enabled: true, tsconfig: "./tsconfig.json" },
  },
});
