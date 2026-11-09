// @vitest-environment node

/**
 * An opt-in add-on (a subpath entry plus a registry item) must cost a user
 * nothing until they import or install it. Each add-on is one row of `ADDONS`.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const src = resolve(root, "src");

// `name` is the registry block; `subpath` is the package export when it differs.
const ADDONS: {
  name: string;
  subpath?: string;
  folder: string;
  entry: string;
  packages: string[];
}[] = [
  {
    name: "monaco",
    folder: "src/components/monaco",
    entry: "src/monaco.ts",
    packages: ["@monaco-editor/react", "monaco-editor"],
  },
  {
    name: "charts",
    folder: "src/components/charts",
    entry: "src/charts.ts",
    packages: ["recharts"],
  },
  {
    name: "kanban",
    folder: "src/components/kanban",
    entry: "src/kanban.ts",
    packages: ["@dnd-kit/react", "@dnd-kit/dom"],
  },
  {
    name: "inspector",
    folder: "src/components/inspector",
    entry: "src/inspector.ts",
    packages: ["@dnd-kit/react"],
  },
  {
    name: "mdx-editor",
    folder: "src/components/mdx-editor",
    entry: "src/mdx-editor.ts",
    packages: ["@mdxeditor/editor"],
  },
  {
    name: "rich-text-input",
    folder: "src/components/rich-text-input",
    entry: "src/rich-text-input.ts",
    packages: [
      "dompurify",
      "@tiptap/core",
      "@tiptap/extension-code-block",
      "@tiptap/extension-code-block-lowlight",
      "@tiptap/extension-image",
      "@tiptap/extension-text-style",
      "@tiptap/extensions",
      "@tiptap/pm",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "highlight.js",
      "lowlight",
    ],
  },
  {
    name: "block-editor",
    folder: "src/components/block-editor",
    entry: "src/block-editor.ts",
    packages: [
      "@tiptap/core",
      "@tiptap/pm",
      "@tiptap/react",
      "@tiptap/starter-kit",
      "@tiptap/extensions",
      "@tiptap/suggestion",
      "@dnd-kit/react",
      "@dnd-kit/dom",
      "recharts",
    ],
  },
  {
    name: "maps",
    folder: "src/components/maps",
    entry: "src/maps.ts",
    packages: ["maplibre-gl"],
  },
  {
    name: "maps-draw",
    subpath: "maps/draw",
    folder: "src/components/maps-draw",
    entry: "src/maps-draw.ts",
    packages: ["terra-draw", "terra-draw-maplibre-gl-adapter"],
  },
  {
    name: "maps-osm",
    subpath: "maps/osm",
    folder: "src/components/maps-osm",
    entry: "src/maps-osm.ts",
    packages: ["maplibre-gl"],
  },
  {
    name: "addon-csv-import",
    subpath: "csv-import",
    folder: "src/components/admin/csv-import",
    entry: "src/csv-import.ts",
    packages: ["papaparse"],
  },
  {
    name: "addon-supabase",
    subpath: "supabase",
    folder: "src/components/admin/supabase",
    entry: "src/supabase.ts",
    packages: ["@chelone/supabase"],
  },
  {
    name: "rsc",
    folder: "src/components/rsc",
    entry: "src/rsc.ts",
    packages: [],
  },
];

const BASE_ENTRIES = ["src/index.ts", "src/tanstack-router.ts"];

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const pkg = readJson(resolve(root, "package.json"));

// Static imports and re-exports only: a dynamic `import()` is a lazy chunk.
const IMPORT_PATTERN =
  /(?:^|[\n;])\s*(?:import|export)\s+(?:type\s+)?(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/g;

const ALIASES: [string, string][] = [
  ["@/components", resolve(src, "components")],
  ["@/lib", resolve(src, "lib")],
  ["@/hooks", resolve(src, "hooks")],
];

function resolveSource(specifier: string, from: string): string | undefined {
  let base: string | undefined;
  if (specifier.startsWith(".")) {
    base = resolve(dirname(from), specifier);
  } else {
    const alias = ALIASES.find(
      ([prefix]) => specifier === prefix || specifier.startsWith(`${prefix}/`),
    );
    if (alias) base = resolve(alias[1], specifier.slice(alias[0].length + 1));
  }
  if (!base) return undefined;
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    resolve(base, "index.ts"),
    resolve(base, "index.tsx"),
  ];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile());
}

/** Every file and bare package specifier the entries reach through static imports. */
function reachable(entries: string[]) {
  const files = new Set<string>();
  const packages = new Set<string>();
  const queue = entries.map((e) => resolve(root, e));
  for (const file of queue) {
    if (files.has(file)) continue;
    files.add(file);
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(IMPORT_PATTERN)) {
      const specifier = match[1];
      if (specifier === undefined) continue;
      const target = resolveSource(specifier, file);
      if (target) queue.push(target);
      else if (!specifier.startsWith(".") && !specifier.startsWith("@/")) {
        packages.add(specifier);
      }
    }
  }
  return { files, packages };
}

describe("add-on boundary", () => {
  it("the base entry points never reach an add-on folder, entry file or package", () => {
    const { files, packages } = reachable(BASE_ENTRIES);
    // Guards the walk itself: an empty graph would pass vacuously.
    expect(files.size).toBeGreaterThan(100);

    for (const addon of ADDONS) {
      const folder = resolve(root, addon.folder);
      const entry = resolve(root, addon.entry);
      const hits = [...files]
        .filter((f) => f === entry || f.startsWith(`${folder}/`))
        .map((f) => relative(root, f));
      expect(hits, `${addon.name} files`).toEqual([]);

      const usedPackages = [...packages].filter((p) =>
        addon.packages.some((name) => p === name || p.startsWith(`${name}/`)),
      );
      expect(usedPackages, `${addon.name} packages`).toEqual([]);
    }
  });

  it("each add-on package is an optional peer and a devDependency and never a dependency", () => {
    for (const { packages } of ADDONS) {
      for (const name of packages) {
        expect(pkg.peerDependencies?.[name], `${name} peer`).toBeTruthy();
        expect(
          pkg.peerDependenciesMeta?.[name]?.optional,
          `${name} optional`,
        ).toBe(true);
        expect(pkg.devDependencies?.[name], `${name} dev`).toBeTruthy();
        expect(pkg.dependencies?.[name], `${name} dependency`).toBeUndefined();
      }
    }
  });

  it("each add-on has a subpath export and a publishConfig export", () => {
    for (const { name, subpath: sub = name, entry } of ADDONS) {
      const subpath = `./${sub}`;
      const file = entry.replace(/^src\//, "").replace(/\.ts$/, "");
      expect(pkg.exports[subpath]).toBe(`./${entry}`);
      expect(pkg.publishConfig.exports[subpath]).toEqual({
        types: `./dist/${file}.d.ts`,
        default: `./dist/${file}.js`,
      });
    }
  });

  for (const addon of ADDONS) {
    it(`the ${addon.name} registry item lists its npm packages under dependencies`, () => {
      const registry = readJson(resolve(root, "registry.json"));
      const items: {
        name: string;
        dependencies?: string[];
        files?: { path: string }[];
      }[] = registry.items;

      const item = items.find((i) => i.name === addon.name);
      expect(item, `${addon.name} item`).toBeDefined();
      expect(item?.dependencies).toEqual(
        expect.arrayContaining(addon.packages),
      );
      for (const name of addon.packages) {
        expect(pkg.peerDependencies[name]).toBeTruthy();
      }

      const admin = items.find((i) => i.name === "admin");
      const leaked = (admin?.files ?? []).filter((f) =>
        f.path.startsWith(addon.folder),
      );
      expect(leaked, "admin item files").toEqual([]);
    });
  }

  it("the mdx-editor dark stylesheet is exported for npm users and survives tree shaking", () => {
    const source = pkg.exports["./mdx-editor.css"];
    expect(existsSync(resolve(root, source))).toBe(true);
    expect(source.endsWith("mdx-editor-dark.css")).toBe(true);
    expect(pkg.publishConfig.exports["./mdx-editor.css"]).toBe(
      "./dist/components/mdx-editor/mdx-editor-dark.css",
    );
    // `sideEffects: false` lets a bundler drop `import "@chelone/react/mdx-editor.css"`.
    expect(pkg.sideEffects).toContain("**/*.css");
  });

  it("the rich-text-input stylesheet is exported for npm users and survives tree shaking", () => {
    const source = pkg.exports["./rich-text-input.css"];
    expect(existsSync(resolve(root, source))).toBe(true);
    expect(source.endsWith("rich-text.css")).toBe(true);
    expect(pkg.publishConfig.exports["./rich-text-input.css"]).toBe(
      "./dist/components/rich-text-input/rich-text.css",
    );
    expect(pkg.sideEffects).toContain("**/*.css");
  });
});
