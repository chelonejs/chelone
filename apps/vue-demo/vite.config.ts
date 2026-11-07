import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

/**
 * `@chelone/vue` is workspace-linked to its SOURCE (`main: ./src/index.ts`, no
 * build step) — this demo consumes the package's `src/` directly. Unlike the
 * React demo, the Vue package's internal imports are all RELATIVE (no shadcn
 * `@/` alias), so no path alias into the package tree is needed here.
 *
 * The `@` alias below points at THIS app's own `src/` (a convenience for the
 * demo's local imports), scoped so it never shadows the `@chelone/*` package
 * specifiers or the `@tanstack/*` / `@tailwindcss/*` scopes.
 */
const appSrc = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  // The website serves this build at `/vue-demo/`, beside the React demo at `/demo/`.
  base: "/vue-demo/",
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@/": `${appSrc}/`,
    },
    // A single Vue instance across the workspace — the linked `@chelone/vue`
    // source and this app must share one copy of the runtime, or provide/inject
    // and the reactivity graph break across the boundary.
    dedupe: ["vue", "vue-router", "@tanstack/vue-query"],
  },
  optimizeDeps: {
    include: ["@tanstack/vue-query", "vue-router", "zod"],
  },
  server: { port: 5473 },
  preview: { port: 5473 },
});
