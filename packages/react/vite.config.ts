import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

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

const dist = fileURLToPath(new URL("./dist", import.meta.url));

// `emptyOutDir` is off because `dist/r` holds the registry output, so stale
// files are removed here instead, sparing only that folder.
const cleanDist: Plugin = {
  name: "clean-dist-except-registry",
  buildStart() {
    if (!existsSync(dist)) return;
    for (const entry of readdirSync(dist, { withFileTypes: true })) {
      if (entry.name !== "r") {
        rmSync(`${dist}/${entry.name}`, { recursive: true, force: true });
      }
    }
  },
};

export default defineConfig({
  plugins: [cleanDist],
  resolve: {
    alias: {
      "@/components": `${src}/components`,
      "@/lib": `${src}/lib`,
      "@/hooks": `${src}/hooks`,
    },
  },
  build: {
    lib: { entry: "src/index.ts", formats: ["es"] },
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: false,
    minify: false,
    rollupOptions: {
      external: isExternal,
      output: {
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
      },
    },
  },
});
