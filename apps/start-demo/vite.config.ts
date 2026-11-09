import { fileURLToPath } from "node:url";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { defineConfig } from "vite";

/**
 * `@chelone/react` is workspace-linked to its SOURCE (`main: ./src/index.ts`),
 * and that source imports its shadcn primitives through the shadcn `@/` alias —
 * which resolves into the package's OWN `src`. Same mapping `apps/demo` uses.
 * The app's own files use relative imports, so there is no `@/` collision.
 */
const reactPkgSrc = fileURLToPath(
  new URL("../../packages/react/src", import.meta.url),
);

export default defineConfig({
  // React Server Components, as the TanStack Start RSC guide sets them up:
  // Start's `rsc` flag adds its server-component environment, and
  // `@vitejs/plugin-rsc` builds it.
  plugins: [tanstackStart({ rsc: { enabled: true } }), rsc(), react()],
  resolve: {
    alias: {
      "@/components": `${reactPkgSrc}/components`,
      "@/lib": `${reactPkgSrc}/lib`,
      "@/hooks": `${reactPkgSrc}/hooks`,
    },
    // One React instance across the workspace (the linked package + this app).
    dedupe: ["react", "react-dom"],
  },
  server: { port: 4274 },
  preview: { port: 4274 },
});
