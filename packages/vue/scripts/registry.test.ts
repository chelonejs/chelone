// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

interface RegistryItem {
  name: string;
  files: { path: string }[];
  dependencies?: string[];
  registryDependencies?: string[];
}

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const items: RegistryItem[] = JSON.parse(
  readFileSync(join(packageRoot, "registry.json"), "utf8"),
).items;
const item = (name: string) => items.find((i) => i.name === name);

const isTest = (name: string) => /\.(test|spec|test-d|stories)\.ts$/.test(name);

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    // Test stand-ins are never shipped; the generator skips them too.
    if (entry.isDirectory())
      return entry.name === "__fixtures__" ? [] : walk(full);
    return /\.(ts|vue)$/.test(entry.name) && !isTest(entry.name) ? [full] : [];
  });

it("every non-test file under src/components is in a registry item", () => {
  const shipped = new Set(items.flatMap((i) => i.files.map((f) => f.path)));
  // components/index.ts is the package's own barrel; no consumer copies it.
  const missing = walk(join(packageRoot, "src/components"))
    .map((file) => relative(packageRoot, file))
    .filter((file) => file !== "src/components/index.ts")
    .filter((file) => !shipped.has(file));

  expect(missing).toEqual([]);
});

it("every @chelone registryDependency names an emitted item", () => {
  const names = new Set(items.map((i) => i.name));
  const dangling = items.flatMap((i) =>
    (i.registryDependencies ?? [])
      .filter((dep) => dep.startsWith("@chelone/"))
      .filter((dep) => !names.has(dep.slice("@chelone/".length)))
      .map((dep) => `${i.name} -> ${dep}`),
  );

  expect(dangling).toEqual([]);
});

it("spinner and ui-spinner are two items", () => {
  expect(item("spinner")?.files.map((f) => f.path)).toEqual([
    "src/components/admin/feedback/spinner.vue",
  ]);
  expect(item("ui-spinner")?.files.map((f) => f.path)).toEqual([
    "src/components/ui/spinner.vue",
  ]);
});

it("text-input declares @chelone/vue as a dependency and no @chelone/index dependency", () => {
  const textInput = item("text-input");

  expect(textInput?.dependencies).toContain("@chelone/vue");
  expect(textInput?.registryDependencies).not.toContain("@chelone/index");
});

it("no shipped file imports the ui barrel", () => {
  const barrelImport =
    /from\s+["'](?:@\/components\/ui|\.{1,2}(?:\/\.\.)*\/ui)(?:\/index)?["']/;
  const offenders = [
    ...new Set(items.flatMap((i) => i.files.map((f) => f.path))),
  ].filter((path) =>
    barrelImport.test(readFileSync(join(packageRoot, path), "utf8")),
  );

  expect(offenders).toEqual([]);
});

it("guess-components imports each component from its own file, not a barrel", () => {
  const source = readFileSync(
    join(packageRoot, "src/components/admin/guessers/guess-components.ts"),
    "utf8",
  );
  const specifiers = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
    (match) => match[1] as string,
  );
  const barrels = specifiers.filter(
    (spec) =>
      /\/(?:ui|components)(?:\/index)?$/.test(spec) ||
      /^\.{1,2}(?:\/\.\.)*$/.test(spec) ||
      /\/index$/.test(spec),
  );

  expect(specifiers).toContain("../fields/text-field.vue");
  expect(barrels).toEqual([]);
});

it("the guessers icons ship as guesser-icons, apart from the other icons.ts items", () => {
  expect(item("guesser-icons")?.files.map((f) => f.path)).toEqual([
    "src/components/admin/guessers/icons.ts",
  ]);
});
