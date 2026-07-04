import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The shadcn `@/` alias the copied `ui/` primitives (and their registry/consumer
// form) import through — `@/components/*`, `@/lib/*`, `@/hooks/*` resolve to
// `src/`, mirroring `tsconfig.json` paths + shadmin's `components.json`. Kept
// prefix-scoped (not a bare `@` → `src`) so it never shadows the package's own
// relative/`@chelone/*` imports.
const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@/components": `${src}/components`,
      "@/lib": `${src}/lib`,
      "@/hooks": `${src}/hooks`,
    },
  },
  test: {
    environment: "jsdom",
    passWithNoTests: true,
    // jsdom lacks ResizeObserver + pointer-capture/scroll APIs that cmdk +
    // Radix popover primitives (composed by the choice inputs) call on mount.
    setupFiles: ["./src/test-setup.ts"],
    typecheck: { enabled: true, tsconfig: "./tsconfig.json" },
  },
});
