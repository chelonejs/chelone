import path from "node:path";
import mdx from "@mdx-js/rollup";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { defineConfig } from "vite";
import { cheloneSourcePlugin } from "./scripts/chelone-source-resolver.mjs";
import { remarkCalloutDirective } from "./scripts/remark-callout-directive.mjs";
import { remarkNeutralizeTextDirectives } from "./scripts/remark-neutralize-text-directives.mjs";
import { remarkRelativeLinks } from "./scripts/remark-relative-links.mjs";
import {
  rehypeTwoslashAssert,
  remarkTwoslash,
  twoslashTransformer,
} from "./scripts/twoslash.mjs";
import { SHIKI_THEME } from "./src/lib/shiki-theme";

// The `@chelone/react` package is workspace-linked to its SOURCE (main:
// ./src/index.ts). Its shadcn primitives import `@/components|lib|hooks/*`,
// which must resolve within the package's OWN src (see cheloneSourcePlugin).
const reactPkgSrc = path.resolve(__dirname, "../../packages/react/src");

// `scripts/dev-showcase.mjs` starts both demos and names their ports here.
function demoProxy() {
  const { DEMO_PORT, VUE_DEMO_PORT } = process.env;
  if (!DEMO_PORT || !VUE_DEMO_PORT) return undefined;
  return {
    "/demo": { target: `http://localhost:${DEMO_PORT}`, ws: true },
    "/vue-demo": { target: `http://localhost:${VUE_DEMO_PORT}`, ws: true },
  };
}

export default defineConfig({
  // +100 from vite's default so it doesn't collide with a user-run server on
  // 5173 (nor the standalone demo on 4273).
  server: { port: 5373, proxy: demoProxy() },
  optimizeDeps: {
    // Pre-bundle react-shiki together with React so it shares the single
    // optimized React chunk instead of inlining its own copy (which would null
    // out the hooks dispatcher → "Cannot read properties of null (useState)").
    // The TanStack deps that `@chelone/react` pulls in transitively must also be
    // pre-bundled against this same React (mirrors apps/demo/vite.config.ts);
    // react-router's `future.unstable_optimizeDeps` runs the optimizer over
    // route modules so they dedupe against this same React.
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react-shiki",
      "@tanstack/react-query",
      "@tanstack/react-store",
      "react-router",
    ],
  },
  plugins: [
    // Must be first: resolves `@/` importer-aware (react-package src vs website
    // src). No scoped-barrel branch — chelone components come from the
    // `@chelone/react` barrel or the `@/` alias.
    cheloneSourcePlugin({
      reactPkgSrc,
      wwwSrc: path.resolve(__dirname, "./src"),
    }),
    // MDX must compile .mdx → JSX BEFORE reactRouter()/React process it, hence
    // enforce: "pre". reactRouter() supplies React + fast-refresh.
    {
      enforce: "pre",
      ...mdx({
        providerImportSource: "@/docs/mdx/mdx-components",
        remarkPlugins: [
          remarkFrontmatter,
          remarkMdxFrontmatter,
          remarkGfm,
          remarkDirective,
          remarkRelativeLinks,
          remarkCalloutDirective,
          // After callouts claim their container directives, revert any stray
          // text/leaf directives (e.g. `:3000` in a URL) back to literal text.
          remarkNeutralizeTextDirectives,
          // Type-checks every `twoslash` fence and throws, naming the page. It
          // runs here rather than as a transformer because rehype-pretty-code
          // catches a transformer's error and re-renders the fence as plaintext.
          remarkTwoslash,
        ],
        rehypePlugins: [
          rehypeSlug,
          [
            rehypePrettyCode,
            {
              // Same theme as the react-shiki code blocks (SHIKI_THEME).
              theme: { ...SHIKI_THEME },
              keepBackground: false,
              // Renders the fences `remarkTwoslash` already checked: hover
              // popups, `// ^?` results and `// @errors` lines. Only a fence
              // whose meta says `twoslash` runs it.
              transformers: [twoslashTransformer],
            },
          ],
          // rehype-pretty-code has already run, so this can raise what it
          // swallowed: the `// @include:` fences `remarkTwoslash` cannot check.
          rehypeTwoslashAssert,
        ],
      }),
    },
    reactRouter(),
    tailwindcss(),
  ],
  resolve: {
    // Force a single React instance across the workspace-linked package + the
    // site, or hooks throw "Cannot read properties of null (reading 'useState')".
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
    // `@/` alias is handled by cheloneSourcePlugin (importer-aware).
  },
});
