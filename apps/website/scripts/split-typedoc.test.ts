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
  flags?: { isOptional?: boolean };
  comment?: { summary: { text: string }[] };
  signatures?: { parameters: { name: string; type: FixtureType }[] }[];
}

const intrinsic = (name: string): FixtureType => ({ type: "intrinsic", name });
const toPropsType = (name: string): FixtureType => ({
  type: "reference",
  name,
});

/** A property of a fixture interface. */
interface FixtureProp {
  name: string;
  type?: FixtureType;
  comment?: string;
  optional?: boolean;
}

/** typedoc's comment node for a doc line. */
const docComment = (text: string) => ({ summary: [{ text }] });

/** A fixture property node. */
function fixtureProp(prop: FixtureProp): FixtureNode {
  return {
    name: prop.name,
    kind: 1024,
    flags: prop.optional ? { isOptional: true } : {},
    type: prop.type,
    comment: prop.comment === undefined ? undefined : docComment(prop.comment),
  };
}

/** An interface with one property per entry of `props`. */
function propsInterface(
  name: string,
  props: (string | FixtureProp)[] = [],
): FixtureNode {
  return {
    name,
    kind: 256,
    children: props.map((prop) =>
      typeof prop === "string" ? { name: prop, kind: 1024 } : fixtureProp(prop),
    ),
  };
}

/** A type alias: `type Name = <type>`. */
function propsAlias(name: string, type: FixtureType): FixtureNode {
  return { name, kind: 2097152, type };
}

/** `A & B & …`, as typedoc writes an intersection. */
function intersection(...types: FixtureType[]): FixtureType {
  return { type: "intersection", types };
}

/** `Omit<T, "a" | "b">`. */
function omitType(target: FixtureType, keys: string[]): FixtureType {
  return {
    type: "reference",
    name: "Omit",
    typeArguments: [
      target,
      {
        type: "union",
        types: keys.map((key) => ({ type: "literal", value: key })),
      },
    ],
  };
}

/** `Pick<T, "a" | "b">`. */
function pickType(target: FixtureType, keys: string[]): FixtureType {
  return {
    type: "reference",
    name: "Pick",
    typeArguments: [
      target,
      {
        type: "union",
        types: keys.map((key) => ({ type: "literal", value: key })),
      },
    ],
  };
}

/** `Partial<T>`. */
function partialType(target: FixtureType): FixtureType {
  return { type: "reference", name: "Partial", typeArguments: [target] };
}

/** An inline object type: `{ a: X; b: Y }`. */
function inlineObject(props: FixtureProp[]): FixtureType {
  return {
    type: "reflection",
    declaration: { children: props.map(fixtureProp) },
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
  props: { name: string; type: string; optional: boolean; comment: string }[];
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
      type: omitType(toPropsType("ShapeInputProps"), ["kind"]),
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

it("keeps only the keys a Pick names", () => {
  const fixture = generatorFixture();
  fixture.generate([
    propsInterface("InputProps", ["format", "label", "source"]),
    {
      name: "AutocompleteInputProps",
      kind: 2097152,
      type: intersection(
        omitType(toPropsType("InputProps"), ["source", "format"]),
        partialType(pickType(toPropsType("InputProps"), ["source"])),
      ),
    },
  ]);

  expect(
    fixture.read("AutocompleteInput").props.map((prop) => prop.name),
  ).toEqual(["label", "source"]);
});

it("lists a member an intersection overrides once, from the overriding branch", () => {
  const fixture = generatorFixture();
  fixture.generate([
    propsInterface("InputProps", [
      {
        name: "onChange",
        type: intrinsic("unknown"),
        comment: "Chained after the parsed value is written.",
      },
      { name: "label", type: intrinsic("ReactNode") },
    ]),
    {
      name: "SelectInputProps",
      kind: 2097152,
      type: intersection(
        partialType(toPropsType("InputProps")),
        inlineObject([
          { name: "onChange", type: intrinsic("string") },
          { name: "resettable", type: intrinsic("boolean") },
        ]),
      ),
    },
  ]);

  expect(fixture.read("SelectInput").props).toEqual([
    {
      name: "onChange",
      type: "string",
      optional: false,
      comment: "Chained after the parsed value is written.",
    },
    { name: "label", type: "ReactNode", optional: false, comment: "" },
    { name: "resettable", type: "boolean", optional: false, comment: "" },
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

it("follows a type alias whose type is a reference to the declaration it names", () => {
  const fixture = generatorFixture();
  fixture.generate([
    propsAlias(
      "SeriesChartProps",
      inlineObject([
        { name: "data", type: intrinsic("readonly TRow[]") },
        {
          name: "title",
          type: intrinsic("string"),
          optional: true,
          comment: "Shown in the card header.",
        },
        { name: "color", type: intrinsic("string"), optional: true },
      ]),
    ),
    propsAlias("BarChartProps", toPropsType("SeriesChartProps")),
  ]);

  expect(fixture.read("BarChart").props).toEqual([
    { name: "data", type: "readonly TRow[]", optional: false, comment: "" },
    {
      name: "title",
      type: "string",
      optional: true,
      comment: "Shown in the card header.",
    },
    { name: "color", type: "string", optional: true, comment: "" },
  ]);
});

it("collects the props of each part of an intersection over a reference", () => {
  const fixture = generatorFixture();
  fixture.generate([
    propsAlias(
      "SeriesChartProps",
      inlineObject([
        { name: "data", type: intrinsic("readonly TRow[]") },
        { name: "title", type: intrinsic("string"), optional: true },
      ]),
    ),
    propsAlias(
      "TrendChartProps",
      intersection(
        toPropsType("SeriesChartProps"),
        inlineObject([
          { name: "area", type: intrinsic("boolean"), optional: true },
        ]),
      ),
    ),
  ]);

  expect(fixture.read("TrendChart").props).toEqual([
    { name: "data", type: "readonly TRow[]", optional: false, comment: "" },
    { name: "title", type: "string", optional: true, comment: "" },
    { name: "area", type: "boolean", optional: true, comment: "" },
  ]);
});

it("leaves a reference typedoc never documented out of the table", () => {
  const fixture = generatorFixture();
  fixture.generate([
    propsAlias(
      "FooProps",
      intersection(
        toPropsType("ComponentProps"),
        inlineObject([{ name: "source" }]),
      ),
    ),
  ]);

  expect(fixture.read("Foo").props.map((prop) => prop.name)).toEqual([
    "source",
  ]);
});

it("stops at a reference cycle between two aliases", () => {
  const fixture = generatorFixture();
  fixture.generate([
    propsAlias(
      "FirstProps",
      intersection(
        toPropsType("SecondProps"),
        inlineObject([{ name: "first", optional: true }]),
      ),
    ),
    propsAlias(
      "SecondProps",
      intersection(
        toPropsType("FirstProps"),
        inlineObject([{ name: "second", optional: true }]),
      ),
    ),
  ]);

  expect(fixture.read("First").props.map((prop) => prop.name)).toEqual([
    "second",
    "first",
  ]);
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

/**
 * The charts read `SeriesChartProps`, which typedoc documents only when
 * `typedoc.json` lists `packages/react/src/components/charts/chart-frame.tsx`.
 * `BarChartProps` extends it and adds `colors`, and `TrendChartProps` adds five
 * props of its own to it.
 */
const SERIES_CHART_PROPS = [
  "bare",
  "className",
  "color",
  "data",
  "height",
  "loading",
  "title",
  "xField",
  "yField",
];

/**
 * `BarChartProps` is an interface, and typedoc lists an interface's members in
 * name order, so its own `colors` sits beside the inherited `color`.
 */
const BAR_CHART_PROPS = [...SERIES_CHART_PROPS, "colors"].sort();

it("lists the props each chart inherits from SeriesChartProps", () => {
  const bar: GeneratedPropsPage = JSON.parse(
    readFileSync(join(propsDir, "BarChart.json"), "utf8"),
  );
  expect(bar.props.map((prop) => prop.name)).toEqual(BAR_CHART_PROPS);

  const trend: GeneratedPropsPage = JSON.parse(
    readFileSync(join(propsDir, "TrendChart.json"), "utf8"),
  );
  expect(trend.props.map((prop) => prop.name)).toEqual([
    ...SERIES_CHART_PROPS,
    "area",
    "smooth",
    "tooltipFormatter",
    "xTickFormatter",
    "yTickFormatter",
  ]);
});
