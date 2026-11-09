import { readFileSync } from "node:fs";
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

// Matches a package and any subpath of it (`zod`, `zod/v4`).
const isExternal = (id: string) =>
  externals.some((name) => id === name || id.startsWith(`${name}/`));

export default defineConfig({
  build: {
    lib: {
      entry: [
        "src/cron/index.ts",
        "src/geo/index.ts",
        "src/i18next/index.ts",
        "src/osm/index.ts",
      ],
      formats: ["es"],
    },
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
