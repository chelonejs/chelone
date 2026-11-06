// @vitest-environment node
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
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

/** A typedoc type node, in the shapes `split-typedoc.mjs` reads. */
interface FixtureType {
  type: string;
  name?: string;
  value?: string | number | null;
  typeArguments?: FixtureType[];
  declaration?: {
    signatures?: { parameters: { name: string; type: FixtureType }[] }[];
    children?: FixtureNode[];
  };
}

/** A typedoc declaration node. Kind 256 = Interface, 32 = Variable, 64 = Function. */
interface FixtureNode {
  name: string;
  kind: number;
  children?: FixtureNode[];
  type?: FixtureType;
  signatures?: { parameters: { name: string; type: FixtureType }[] }[];
}

const intrinsic = (name: string): FixtureType => ({ type: "intrinsic", name });
const toPropsType = (name: string): FixtureType => ({
  type: "reference",
  name,
});

/** An interface with one property per name in `props`. */
function propsInterface(name: string, props: string[] = []): FixtureNode {
  return {
    name,
    kind: 256,
    children: props.map((prop) => ({ name: prop, kind: 1024 })),
  };
}

/** A function component whose props are the first parameter of its signature. */
function functionComponent(name: string, propsType: FixtureType): FixtureNode {
  return {
    name,
    kind: 64,
    signatures: [
      { parameters: [{ name: "__namedParameters", type: propsType }] },
    ],
  };
}

/** A const holding a component, as `PointField = GeoJsonField` is typed. */
function constComponent(name: string, propsType: FixtureType): FixtureNode {
  return {
    name,
    kind: 32,
    type: {
      type: "reflection",
      declaration: {
        signatures: [
          { parameters: [{ name: "__namedParameters", type: propsType }] },
        ],
      },
    },
  };
}

function generatorFixture() {
  const root = mkdtempSync(join(tmpdir(), "props-generation-"));
  fixtures.push(root);
  const scripts = join(root, "scripts");
  mkdirSync(scripts);
  const script = join(scripts, "split-typedoc.mjs");
  copyFileSync(new URL("./split-typedoc.mjs", import.meta.url), script);
  return {
    propsDir: join(root, "src/docs/content/props"),
    generate(nodes: FixtureNode[]) {
      writeFileSync(
        join(scripts, "public-api.typedoc.json"),
        JSON.stringify({ children: nodes }),
      );
      execFileSync(process.execPath, [script]);
    },
    read(componentName: string) {
      const page: GeneratedPropsPage = JSON.parse(
        readFileSync(join(this.propsDir, `${componentName}.json`), "utf8"),
      );
      return page;
    },
  };
}

/** One generated props page, as `split-typedoc.mjs` writes it. */
interface GeneratedPropsPage {
  name: string;
  props: { name: string }[];
}

it("replaces the old props page when an exported interface is renamed", () => {
  const fixture = generatorFixture();
  fixture.generate([propsInterface("FooProps")]);
  expect(readdirSync(fixture.propsDir)).toEqual(["Foo.json"]);

  fixture.generate([propsInterface("BarProps")]);

  expect(readdirSync(fixture.propsDir)).toEqual(["Bar.json"]);
});

it("preserves the props page when an exported interface changes only case", () => {
  const fixture = generatorFixture();
  fixture.generate([propsInterface("FooProps")]);

  fixture.generate([propsInterface("FOOProps")]);

  expect(readdirSync(fixture.propsDir)).toEqual(["FOO.json"]);

  fixture.generate([propsInterface("FOOProps")]);

  expect(readdirSync(fixture.propsDir)).toEqual(["FOO.json"]);
});

it("removes the last props page while preserving non-JSON files", () => {
  const fixture = generatorFixture();
  fixture.generate([propsInterface("FooProps")]);
  writeFileSync(join(fixture.propsDir, "README.md"), "Generated props pages\n");

  fixture.generate([]);

  expect(readdirSync(fixture.propsDir)).toEqual(["README.md"]);
});

it("gives a component with no props interface the props of the type it takes", () => {
  const fixture = generatorFixture();
  fixture.generate([
    propsInterface("GeoJsonFieldProps", ["source", "mapStyle"]),
    constComponent("PointField", toPropsType("GeoJsonFieldProps")),
  ]);

  expect(readdirSync(fixture.propsDir).sort()).toEqual([
    "GeoJsonField.json",
    "PointField.json",
  ]);
  expect(fixture.read("PointField").props.map((prop) => prop.name)).toEqual([
    "source",
    "mapStyle",
  ]);
});

it("reads a type alias over another props type, dropping what it omits", () => {
  const fixture = generatorFixture();
  fixture.generate([
    propsInterface("ShapeInputProps", ["source", "kind", "tools"]),
    {
      name: "GeoJsonInputBaseProps",
      kind: 2097152,
      type: {
        type: "reference",
        name: "Omit",
        typeArguments: [
          toPropsType("ShapeInputProps"),
          { type: "literal", value: "kind" },
        ],
      },
    },
    functionComponent("PointInput", toPropsType("GeoJsonInputBaseProps")),
  ]);

  expect(
    fixture.read("GeoJsonInputBase").props.map((prop) => prop.name),
  ).toEqual(["source", "tools"]);
  expect(fixture.read("PointInput").props.map((prop) => prop.name)).toEqual([
    "source",
    "tools",
  ]);
});

it("leaves a hook or plain function without a props page", () => {
  const fixture = generatorFixture();
  fixture.generate([
    propsInterface("GeoJsonFieldProps", ["source"]),
    functionComponent("useMap", toPropsType("GeoJsonFieldProps")),
    functionComponent("simplifyGeo", toPropsType("GeoJsonFieldProps")),
  ]);

  expect(readdirSync(fixture.propsDir)).toEqual(["GeoJsonField.json"]);
});

const propsDir = new URL("../src/docs/content/props/", import.meta.url)
  .pathname;

/**
 * Components exported only from an add-on entry (`/maps`, `/maps/draw`,
 * `/maps/osm`, `/supabase`, `/csv-import`). Their props pages exist only when
 * `typedoc.json` lists those entries.
 */
const ADDON_PROPS_PAGES = [
  "PointField",
  "PointInput",
  "GeocodingInput",
  "SupabaseLoginPage",
  "CsvImport",
];

it.each(ADDON_PROPS_PAGES)(
  "the add-on component %s has a generated props page",
  (name) => {
    const file = join(propsDir, `${name}.json`);
    expect(existsSync(file), `${name} has a props JSON`).toBe(true);

    const page: GeneratedPropsPage = JSON.parse(readFileSync(file, "utf8"));
    expect(page.name).toBe(name);
    expect(page.props.length, `${name} props`).toBeGreaterThan(0);
  },
);
