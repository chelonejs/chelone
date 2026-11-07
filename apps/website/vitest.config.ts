import path from "node:path";
import mdx from "@mdx-js/rollup";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { defineConfig } from "vitest/config";

// Static `@/` resolution for the jsdom render tests. Mirrors the importer-aware
// build-time resolver (chelone-source-resolver.mjs) with fixed aliases: the
// website's own `@/…` (docs / lib) resolve to `src`, while the package's shadcn
// primitives (`@/components/*`, `@/lib/*`, `@/hooks/*`) resolve into the
// @chelone/react source. The package-scoped prefixes are listed FIRST so they
// win over the catch-all website `@/`.
const wwwSrc = path.resolve(__dirname, "./src");
const reactPkgSrc = path.resolve(__dirname, "../../packages/react/src");

const mdxPlugin = mdx({
  providerImportSource: "@/docs/mdx/mdx-components",
  remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm],
  // The build gives headings their ids with rehype-slug; the linkable headings need them.
  rehypePlugins: [rehypeSlug],
});

export default defineConfig({
  // Use React 19's automatic JSX runtime so test/demo TSX needs no `import React`
  // (matches the app's tsconfig `jsx: "react-jsx"`).
  esbuild: { jsx: "automatic" },
  plugins: [
    {
      ...mdxPlugin,
      transform: {
        // MDX strips queries before filtering, so skip raw imports here.
        filter: { id: { exclude: /[?&]raw(?:&|$)/ } },
        handler: mdxPlugin.transform,
      },
    },
  ],
  resolve: {
    alias: [
      // Website-only lib module; must precede the package-wide `@/lib/` alias.
      {
        find: /^@\/lib\/shiki-theme$/,
        replacement: `${wwwSrc}/lib/shiki-theme`,
      },
      // The website's own components that share the `@/components/` prefix with
      // the package's shadcn primitives. The build resolves `@/` per importer
      // (chelone-source-resolver.mjs); these aliases restate that for the few
      // names only the website has.
      {
        find: /^@\/components\/(brand|doc-search|site-nav|theme-toggle)$/,
        replacement: `${wwwSrc}/components/$1`,
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
      // jsdom has no WebGL, so the maps demos mount against the stand-ins the
      // package's own maps tests mock `maplibre-gl` and Terra Draw with.
      {
        find: /^maplibre-gl$/,
        replacement: `${reactPkgSrc}/components/maps/__fixtures__/fake-maplibre.ts`,
      },
      {
        find: /^terra-draw(-maplibre-gl-adapter)?$/,
        replacement: `${reactPkgSrc}/components/maps-draw/__fixtures__/fake-terra-draw.ts`,
      },
    ],
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  test: {
    environment: "jsdom",
    globals: true,
    // A docs page imports its live demo lazily, so a test that waits for the
    // demo waits on a module load. `src/test-setup.ts` gives those waits 10s;
    // this has to outlast them, or vitest ends the test first.
    testTimeout: 20_000,
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
