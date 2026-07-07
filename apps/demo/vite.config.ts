import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * `@chelone/react` is workspace-linked to its SOURCE (`main: ./src/index.ts`,
 * no build step). Its ported admin components import the shadcn `ui/` primitives
 * (and `lib/`/`hooks/` helpers) through the shadcn `@/` alias — those imports
 * resolve to the package's OWN `src/`. So the demo must map `@` → the react
 * package's `src` for that source to resolve. The demo's OWN files use RELATIVE
 * imports (`./resources/*`), so there is no `@/` collision with the demo tree.
 */
const reactPkgSrc = fileURLToPath(
  new URL("../../packages/react/src", import.meta.url),
);

export default defineConfig({
  // Served under `/demo/` on the deployed site (the website's build step copies
  // this app's `dist/` into `build/client/demo/`, decision B). The base rewrites
  // every emitted asset URL to `/demo/assets/*` so they resolve there; paired
  // with `<BrowserRouter basename="/demo">` so the admin's client routes match.
  // Standalone `pnpm --filter @chelone/demo dev|preview` still works — Vite maps
  // the base to the dev-server root, so http://localhost:4273/demo/ serves it.
  base: "/demo/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Prefix-scoped so it never shadows `@chelone/*` package specifiers.
      "@/components": `${reactPkgSrc}/components`,
      "@/lib": `${reactPkgSrc}/lib`,
      "@/hooks": `${reactPkgSrc}/hooks`,
    },
    // A single React instance across the workspace (the linked package + the
    // demo must share one copy, or hooks throw the "invalid hook call" error).
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["@tanstack/react-query", "@tanstack/react-store", "react-router"],
  },
  server: { port: 4273 },
  preview: { port: 4273 },
});
