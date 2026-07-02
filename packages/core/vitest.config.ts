import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    passWithNoTests: true,
    typecheck: { enabled: true, tsconfig: "./tsconfig.json" },
  },
});
