import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { withUseClient } from "../../scripts/registry/use-client.mjs";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const externals = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
];

// Matches a package and any subpath of it (`react`, `react/jsx-runtime`).
const isExternal = (id: string) =>
  externals.some((name) => id === name || id.startsWith(`${name}/`));

// Same `@/` aliases as vitest.config.ts: the copied `ui/` primitives import
// through them, and the build must inline them as relative paths.
const src = fileURLToPath(new URL("./src", import.meta.url));

// `scripts/registry/build-registry.mjs` writes the shadcn registry output to `dist/r`.
const REGISTRY_FOLDER = "r";

// `emptyOutDir` is off because `dist/r` holds the registry output, so stale
// files are removed here instead, sparing only that folder. The folder comes
// from the resolved config, so it is the one Vite writes to.
const cleanDist = (): Plugin => {
  let outDir = "";
  return {
    name: "clean-dist-except-registry",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    buildStart() {
      if (!existsSync(outDir)) return;
      for (const entry of readdirSync(outDir, { withFileTypes: true })) {
        if (entry.name !== REGISTRY_FOLDER) {
          rmSync(`${outDir}/${entry.name}`, { recursive: true, force: true });
        }
      }
    },
  };
};

// A test, story or type-test file never reaches the build; the rest of `src`
// gets the directive on the module that calls a client API, and
// `preserveModules` keeps it on that output module. `pre` so the check reads
// the source, where `onClick={...}` has not become a props object yet.
const TEST_FILE = /\.(?:test|test-d|stories)\.tsx?$|\/__fixtures__\//;

const markClientModules = (): Plugin => ({
  name: "use-client-directive",
  enforce: "pre",
  transform(code, id) {
    const file = id.split("?")[0] ?? id;
    if (!file.startsWith(`${src}/`) || !/\.tsx?$/.test(file)) return null;
    if (TEST_FILE.test(file)) return null;
    const marked = withUseClient(code);
    return marked === code ? null : { code: marked, map: null };
  },
});

export default defineConfig({
  plugins: [cleanDist(), markClientModules()],
  resolve: {
    alias: {
      "@/components": `${src}/components`,
      "@/lib": `${src}/lib`,
      "@/hooks": `${src}/hooks`,
    },
  },
  build: {
    lib: {
      entry: [
        "src/index.ts",
        "src/tanstack-router.ts",
        "src/next.ts",
        "src/monaco.ts",
        "src/charts.ts",
        "src/kanban.ts",
        "src/inspector.ts",
        "src/mdx-editor.ts",
        "src/rich-text-input.ts",
        "src/block-editor.ts",
        "src/maps.ts",
        "src/maps-draw.ts",
        "src/maps-osm.ts",
        "src/supabase.ts",
        "src/csv-import.ts",
      ],
      formats: ["es"],
    },
    outDir: "dist",
    emptyOutDir: false,
    cssCodeSplit: true,
    sourcemap: false,
    minify: false,
    rollupOptions: {
      external: isExternal,
      // The directive is kept per module; the warning fires once for each of the
      // several hundred marked modules and hides the real ones.
      onwarn(warning, warn) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
        warn(warning);
      },
      output: {
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
      },
    },
  },
});
