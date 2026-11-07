import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * The test mirror of `vite.config.ts`: `@chelone/react` is workspace-linked to
 * its source, and that source imports its shadcn primitives through the `@/`
 * alias, so `@/` must resolve into the package's own `src` here too (the demo's
 * own files use relative imports). No Tailwind plugin: jsdom applies no CSS.
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
    setupFiles: ["./src/test-setup.ts"],
  },
});
