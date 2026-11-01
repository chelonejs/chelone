// @vitest-environment node
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it } from "vitest";

const generateScript = fileURLToPath(
  new URL("../../../scripts/registry/generate-registry.mjs", import.meta.url),
);

const buildScript = fileURLToPath(
  new URL("../../../scripts/registry/build-registry.mjs", import.meta.url),
);

const fixtures: string[] = [];

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    rmSync(fixture, { recursive: true, force: true });
  }
});

interface Engine {
  package: string;
  sourceExtensions: string[];
  implicitDependencies: string[];
  cli: string;
  itemNames: Record<string, string>;
}

const vueEngine: Engine = {
  package: "@chelone/vue",
  sourceExtensions: [".ts", ".vue"],
  implicitDependencies: ["vue"],
  cli: "fake-registry",
  itemNames: {},
};

const config = (engine: Engine, adminExtras = "") => `
export const registryMetadata = { name: "Fixture", homepage: "https://example.test" };
export const AUTHOR = "Fixture";
export const categoriesForGranular = () => ["fixture"];
export const themes = [];
export const baseStyles = [];
export const blocks = [
  {
    name: "ui",
    type: "registry:block",
    title: "UI",
    granularize: true,
    sourceDirs: [{ path: "src/components/ui", recursive: true }],
  },
  {
    name: "admin",
    type: "registry:block",
    title: "Admin",
    granularize: true,
    sourceDirs: [{ path: "src/components/admin", recursive: true }],
    ${adminExtras}
  },
];
export const engine = ${JSON.stringify(engine)};
`;

const componentsJson = {
  style: "new-york",
  tailwind: {},
  iconLibrary: "lucide",
  aliases: {
    components: "@/components",
    utils: "@/lib/utils",
    ui: "@/components/ui",
    lib: "@/lib",
    hooks: "@/composables",
  },
};

const engineSource = {
  "src/use-thing.ts": "export const useThing = () => 1;\n",
  "src/index.ts": 'export { useThing } from "./use-thing";\n',
};

const uiSource = {
  "src/components/ui/button.vue":
    '<script setup lang="ts">\nconst label = "ok";\n</script>\n<template><button>{{ label }}</button></template>\n',
  "src/components/ui/card.vue":
    "<template><section><slot /></section></template>\n",
};

// Stands in for `shadcn-vue build <registry> -o <dir>`: one dist/r file per
// item, each file carrying its source as `content`.
const fakeRegistryCli = `#!/usr/bin/env node
const { readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const registry = JSON.parse(readFileSync(process.argv[3], "utf8"));
for (const item of registry.items) {
  const files = item.files.map((file) => ({
    ...file,
    content: readFileSync(file.path, "utf8"),
  }));
  writeFileSync(
    join(process.argv[5], item.name + ".json"),
    JSON.stringify({ ...item, files }),
  );
}
`;

function generatorFixture(
  sources: Record<string, string>,
  engine: Engine = vueEngine,
  options: { packageJson?: object; adminExtras?: string } = {},
) {
  const root = mkdtempSync(join(tmpdir(), "registry-scripts-"));
  fixtures.push(root);
  const files: Record<string, string> = {
    "package.json": JSON.stringify(
      options.packageJson ?? { name: "fixture", dependencies: {} },
    ),
    "components.json": JSON.stringify(componentsJson),
    "scripts/registry.config.mjs": config(engine, options.adminExtras),
    "node_modules/.bin/fake-registry": fakeRegistryCli,
    ...engineSource,
    ...sources,
  };
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  chmodSync(join(root, "node_modules/.bin/fake-registry"), 0o755);
  const result = spawnSync(process.execPath, [generateScript], {
    cwd: root,
    encoding: "utf8",
  });
  return {
    status: result.status,
    stderr: result.stderr,
    build() {
      return spawnSync(process.execPath, [buildScript], {
        cwd: root,
        encoding: "utf8",
      });
    },
    item(name: string) {
      const registry = JSON.parse(
        readFileSync(join(root, "registry.json"), "utf8"),
      );
      return registry.items.find(
        (item: { name: string }) => item.name === name,
      );
    },
  };
}

it("a .vue file becomes a registry:component item whose imports come from its script block", () => {
  const fixture = generatorFixture({
    ...uiSource,
    "src/components/admin/greeting.vue": [
      '<script setup lang="ts">',
      'import Button from "@/components/ui/button.vue";',
      "</script>",
      "<template>",
      "  <p>{{ 'import Card from \"@/components/ui/card.vue\"' }}</p>",
      "</template>",
      "",
    ].join("\n"),
  });

  expect(fixture.stderr).toBe("");
  expect(fixture.status).toBe(0);
  const greeting = fixture.item("greeting");
  expect(greeting.type).toBe("registry:component");
  expect(greeting.files).toEqual([
    { path: "src/components/admin/greeting.vue", type: "registry:component" },
  ]);
  expect(greeting.registryDependencies).toEqual(["@chelone/button"]);
  expect(fixture.item("admin").registryDependencies).toEqual([
    "@chelone/button",
  ]);
});

it("an engine relative import becomes a dependency on the configured engine package", () => {
  const fixture = generatorFixture({
    "src/components/admin/greeting.vue": [
      '<script setup lang="ts">',
      'import { ref } from "vue";',
      'import { useThing } from "../../use-thing";',
      "</script>",
      "<template><p /></template>",
      "",
    ].join("\n"),
  });

  expect(fixture.stderr).toBe("");
  expect(fixture.item("greeting").dependencies).toEqual(["@chelone/vue"]);
});

it("an import of the ui barrel fails generate and names the file", () => {
  const fixture = generatorFixture({
    ...uiSource,
    "src/components/ui/index.ts":
      'export { default as Button } from "./button.vue";\n',
    "src/components/admin/greeting.vue": [
      '<script setup lang="ts">',
      'import { Button } from "@/components/ui";',
      "</script>",
      "<template><p /></template>",
      "",
    ].join("\n"),
  });

  expect(fixture.status).not.toBe(0);
  expect(fixture.stderr).toContain("src/components/admin/greeting.vue");
});

it("itemNames keeps two icons.ts files apart and points their importers at the new names", () => {
  const fixture = generatorFixture(
    {
      "src/components/admin/alpha/icons.ts": "export const alpha = 1;\n",
      "src/components/admin/beta/icons.ts": "export const beta = 2;\n",
      "src/components/admin/panel.vue": [
        '<script setup lang="ts">',
        'import { alpha } from "./alpha/icons";',
        'import { beta } from "./beta/icons";',
        "</script>",
        "<template><p /></template>",
        "",
      ].join("\n"),
    },
    {
      ...vueEngine,
      itemNames: {
        "components/admin/alpha/icons": "alpha-icons",
        "components/admin/beta/icons": "beta-icons",
      },
    },
  );

  expect(fixture.stderr).toBe("");
  expect(fixture.item("alpha-icons").files).toEqual([
    { path: "src/components/admin/alpha/icons.ts", type: "registry:component" },
  ]);
  expect(fixture.item("beta-icons")).toBeDefined();
  expect(fixture.item("panel").registryDependencies).toEqual([
    "@chelone/alpha-icons",
    "@chelone/beta-icons",
  ]);
});

it("an engine symbol missing from src/index.ts fails generate", () => {
  const fixture = generatorFixture({
    "src/components/admin/greeting.vue": [
      '<script setup lang="ts">',
      'import { useThing, useMissing } from "../../use-thing";',
      "</script>",
      "<template><p /></template>",
      "",
    ].join("\n"),
  });

  expect(fixture.status).not.toBe(0);
  expect(fixture.stderr).toContain("useMissing");
});

it("build accepts a .vue item whose template text looks like an import", () => {
  const fixture = generatorFixture({
    ...uiSource,
    ...engineSource,
    "src/components/admin/greeting.vue": [
      '<script setup lang="ts">',
      'import Button from "@/components/ui/button.vue";',
      "</script>",
      "<template>",
      "  <p>{{ 'import Card from \"@/components/ui/card.vue\"' }}</p>",
      "  <p>{{ 'import { useThing } from \"../../use-thing\"' }}</p>",
      "</template>",
      "",
    ].join("\n"),
  });
  expect(fixture.status).toBe(0);

  const build = fixture.build();

  expect(build.status, build.stderr).toBe(0);
  expect(build.stdout).toContain("Gate passed.");
});

it("itemNames keyed on a ui subdir's index renames the one item the subdir ships as", () => {
  const fixture = generatorFixture(
    {
      "src/components/ui/color-picker/index.ts":
        'export { default as ColorPicker } from "./color-picker.vue";\n',
      "src/components/ui/color-picker/color-picker.vue":
        '<template><input type="color" /></template>\n',
      "src/components/ui/color-picker/color-picker.types.ts":
        "export type Color = string;\n",
    },
    {
      ...vueEngine,
      itemNames: { "components/ui/color-picker/index": "picker" },
    },
  );

  expect(fixture.stderr).toBe("");
  expect(fixture.item("color-picker")).toBeUndefined();
  expect(
    fixture.item("picker").files.map((file: { path: string }) => file.path),
  ).toEqual([
    "src/components/ui/color-picker/color-picker.types.ts",
    "src/components/ui/color-picker/color-picker.vue",
    "src/components/ui/color-picker/index.ts",
  ]);
});

const importsMap = (...packages: string[]) => ({
  "src/components/admin/map.vue": [
    '<script setup lang="ts">',
    ...packages.map((pkg, i) => `import dep${i} from "${pkg}";`),
    "</script>",
    "<template><p /></template>",
    "",
  ].join("\n"),
});

const optionalPeer = {
  peerDependencies: { "maplibre-gl": "^5.0.0" },
  peerDependenciesMeta: { "maplibre-gl": { optional: true } },
};

it("an import of an optional peer becomes an item dependency", () => {
  const fixture = generatorFixture(importsMap("maplibre-gl"), vueEngine, {
    packageJson: { name: "fixture", ...optionalPeer },
  });

  expect(fixture.stderr).toBe("");
  expect(fixture.item("map").dependencies).toEqual(["maplibre-gl"]);
  expect(fixture.item("map").devDependencies).toBeUndefined();
});

it("an optional peer also listed in devDependencies is a dependency and not a devDependency", () => {
  const fixture = generatorFixture(importsMap("maplibre-gl"), vueEngine, {
    packageJson: {
      name: "fixture",
      ...optionalPeer,
      devDependencies: { "maplibre-gl": "^5.0.0" },
    },
  });

  expect(fixture.item("map").dependencies).toEqual(["maplibre-gl"]);
  expect(fixture.item("map").devDependencies).toBeUndefined();
});

it("a regular dependency wins over an optional peer of the same name", () => {
  const fixture = generatorFixture(importsMap("maplibre-gl"), vueEngine, {
    packageJson: {
      name: "fixture",
      ...optionalPeer,
      dependencies: { "maplibre-gl": "^5.0.0" },
      devDependencies: { "maplibre-gl": "^5.0.0" },
    },
  });

  expect(fixture.item("map").dependencies).toEqual(["maplibre-gl"]);
  expect(fixture.item("map").devDependencies).toBeUndefined();
});

it("a required peer listed in devDependencies stays a devDependency", () => {
  const fixture = generatorFixture(importsMap("maplibre-gl"), vueEngine, {
    packageJson: {
      name: "fixture",
      peerDependencies: { "maplibre-gl": "^5.0.0" },
      peerDependenciesMeta: { "maplibre-gl": { optional: false } },
      devDependencies: { "maplibre-gl": "^5.0.0" },
    },
  });

  expect(fixture.item("map").dependencies).toBeUndefined();
  expect(fixture.item("map").devDependencies).toEqual(["maplibre-gl"]);
});

const mapAndDraw = {
  ...importsMap("maplibre-gl"),
  "src/components/admin/draw.vue": [
    '<script setup lang="ts">',
    'import { TerraDraw } from "terra-draw";',
    'import maplibre from "maplibre-gl";',
    "</script>",
    "<template><p /></template>",
    "",
  ].join("\n"),
};

const mapAndDrawPeers = {
  name: "fixture",
  peerDependencies: { "maplibre-gl": "^5.0.0", "terra-draw": "^1.0.0" },
  peerDependenciesMeta: {
    "maplibre-gl": { optional: true },
    "terra-draw": { optional: true },
  },
};

it("inferDependencies gives the block item the union of its granular dependencies", () => {
  const fixture = generatorFixture(mapAndDraw, vueEngine, {
    packageJson: mapAndDrawPeers,
    adminExtras: "inferDependencies: true,",
  });

  expect(fixture.stderr).toBe("");
  expect(fixture.item("admin").dependencies).toEqual([
    "maplibre-gl",
    "terra-draw",
  ]);
});

it("a block without inferDependencies gets no dependencies", () => {
  const fixture = generatorFixture(mapAndDraw, vueEngine, {
    packageJson: mapAndDrawPeers,
  });

  expect(fixture.stderr).toBe("");
  expect(fixture.item("map").dependencies).toEqual(["maplibre-gl"]);
  expect(fixture.item("admin").dependencies).toBeUndefined();
});
