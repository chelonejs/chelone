import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

// Mirror `@chelone/react`'s prefix-scoped shadcn `@/` alias so the copied
// shadcn-vue `ui/` primitives resolve `@/components/*`, `@/lib/*`,
// `@/composables/*` to `src/` (matches `tsconfig.json` paths). Kept
// prefix-scoped so it never shadows the package's own relative / `@chelone/*`
// imports.
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
});
