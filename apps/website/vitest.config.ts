import path from "node:path";
import { defineConfig } from "vitest/config";

// Static `@/` resolution for the jsdom render tests. Mirrors the importer-aware
// build-time resolver (chelone-source-resolver.mjs) with fixed aliases: the
// website's own `@/…` (docs / lib) resolve to `src`, while the package's shadcn
// primitives (`@/components/*`, `@/lib/*`, `@/hooks/*`) resolve into the
// @chelone/react source. The package-scoped prefixes are listed FIRST so they
// win over the catch-all website `@/`.
const wwwSrc = path.resolve(__dirname, "./src");
const reactPkgSrc = path.resolve(__dirname, "../../packages/react/src");

export default defineConfig({
  // Use React 19's automatic JSX runtime so test/demo TSX needs no `import React`
  // (matches the app's tsconfig `jsx: "react-jsx"`).
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: [
      // Website-only lib module; must precede the package-wide `@/lib/` alias.
      {
        find: /^@\/lib\/shiki-theme$/,
        replacement: `${wwwSrc}/lib/shiki-theme`,
      },
      { find: /^@\/components\//, replacement: `${reactPkgSrc}/components/` },
      { find: /^@\/hooks\//, replacement: `${reactPkgSrc}/hooks/` },
      // The website has no `lib/` beyond utils + shiki-theme; the package's
      // deep `@/lib/*` (field-types etc.) must resolve into the package. The
      // website's own `@/lib/utils` also lives there conceptually, but the
      // package ships an identical `cn`, so pointing lib/* at the package is
      // safe for the render test.
      { find: /^@\/lib\//, replacement: `${reactPkgSrc}/lib/` },
      { find: /^@\//, replacement: `${wwwSrc}/` },
    ],
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    // The docs engine's other pure-logic tests (nav-sequence / registry) run
    // under `node --test` (node:test), not vitest. `nav.test.ts` is vitest, and
    // `nav-content.test.ts` needs Vite's `import.meta.glob`.
    include: [
      "src/**/*.test.tsx",
      "src/docs/nav.test.ts",
      "src/docs/nav-content.test.ts",
      "src/landing/**/*.test.ts",
      "scripts/**/*.test.ts",
    ],
  },
});
