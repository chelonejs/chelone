import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

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

// Matches a package and any subpath of it (`vue`, `vue/server-renderer`).
const isExternal = (id: string) =>
  externals.some((name) => id === name || id.startsWith(`${name}/`));

// Mirror `@chelone/react`'s prefix-scoped shadcn `@/` alias so the copied
// shadcn-vue `ui/` primitives resolve `@/components/*`, `@/lib/*`,
// `@/composables/*` to `src/` (matches `tsconfig.json` paths). Kept
// prefix-scoped so it never shadows the package's own relative / `@chelone/*`
// imports.
const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@/components": `${src}/components`,
      "@/lib": `${src}/lib`,
      "@/composables": `${src}/composables`,
    },
  },
  build: {
    lib: { entry: "src/index.ts", formats: ["es"] },
    outDir: "dist",
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
