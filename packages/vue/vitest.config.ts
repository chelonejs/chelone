import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

// See vite.config.ts — the prefix-scoped shadcn `@/` alias for the copied
// shadcn-vue `ui/` primitives, mirroring `tsconfig.json` paths.
const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@/components": `${src}/components`,
      "@/lib": `${src}/lib`,
      "@/composables": `${src}/composables`,
    },
  },
  test: {
    environment: "jsdom",
    passWithNoTests: true,
    typecheck: { enabled: true, tsconfig: "./tsconfig.json" },
  },
});
