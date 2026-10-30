// @vitest-environment node
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";

const fixtures: string[] = [];

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    rmSync(fixture, { recursive: true, force: true });
  }
});

function generatorFixture() {
  const root = mkdtempSync(join(tmpdir(), "props-generation-"));
  fixtures.push(root);
  const scripts = join(root, "scripts");
  mkdirSync(scripts);
  const script = join(scripts, "split-typedoc.mjs");
  copyFileSync(new URL("./split-typedoc.mjs", import.meta.url), script);
  return {
    propsDir: join(root, "src/docs/content/props"),
    generate(names: string[]) {
      writeFileSync(
        join(scripts, "public-api.typedoc.json"),
        JSON.stringify({
          children: names.map((name) => ({
            name,
            kind: 256,
            children: [],
          })),
        }),
      );
      execFileSync(process.execPath, [script]);
    },
  };
}

it("replaces the old props page when an exported interface is renamed", () => {
  const fixture = generatorFixture();
  fixture.generate(["FooProps"]);
  expect(readdirSync(fixture.propsDir)).toEqual(["Foo.json"]);

  fixture.generate(["BarProps"]);

  expect(readdirSync(fixture.propsDir)).toEqual(["Bar.json"]);
});

it("preserves the props page when an exported interface changes only case", () => {
  const fixture = generatorFixture();
  fixture.generate(["FooProps"]);

  fixture.generate(["FOOProps"]);

  expect(readdirSync(fixture.propsDir)).toEqual(["FOO.json"]);

  fixture.generate(["FOOProps"]);

  expect(readdirSync(fixture.propsDir)).toEqual(["FOO.json"]);
});

it("removes the last props page while preserving non-JSON files", () => {
  const fixture = generatorFixture();
  fixture.generate(["FooProps"]);
  writeFileSync(join(fixture.propsDir, "README.md"), "Generated props pages\n");

  fixture.generate([]);

  expect(readdirSync(fixture.propsDir)).toEqual(["README.md"]);
});
