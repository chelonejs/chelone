import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * The test mirror of `vite.config.ts` minus the Start plugin: the tests drive
 * `getRouter()` directly (a router + `renderToString`, no server), and jsdom
 * applies no CSS, so no Tailwind. The `@/` alias is the one thing that must
 * match: `@chelone/react` is workspace-linked to its source.
 */
const reactPkgSrc = fileURLToPath(
  new URL("../../packages/react/src", import.meta.url),
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@/components": `${reactPkgSrc}/components`,
      "@/lib": `${reactPkgSrc}/lib`,
      "@/hooks": `${reactPkgSrc}/hooks`,
    },
    dedupe: ["react", "react-dom"],
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.tsx"],
  },
});
