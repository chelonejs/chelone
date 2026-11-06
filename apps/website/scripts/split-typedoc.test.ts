// @vitest-environment node
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
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

/** The slice of a typedoc JSON document the splitter reads. */
type FixtureType =
  | { type: "intrinsic"; name: string }
  | { type: "array"; elementType: FixtureType }
  | {
      type: "reference";
      name: string;
      /** typedoc links a documented declaration by id, and names a source location for the rest. */
      target:
        | number
        | { packageName: string; packagePath: string; qualifiedName: string };
    }
  | { type: "reflection"; declaration: { children: FixtureMember[] } }
  | { type: "intersection"; types: FixtureType[] };

interface FixtureMember {
  id: number;
  name: string;
  /** kind 1024 = Property. */
  kind: 1024;
  flags: { isOptional?: boolean };
  comment?: { summary: { kind: "text"; text: string }[] };
  type: FixtureType;
}

interface FixtureDeclaration {
  id: number;
  name: string;
  /** kind 256 = Interface, kind 2097152 = TypeAlias. */
  kind: 256 | 2097152;
  children?: FixtureMember[];
  type?: FixtureType;
}

/** One row of a generated props file. */
interface GeneratedProp {
  name: string;
  type: string;
  optional: boolean;
  comment: string;
}

interface GeneratedPropsFile {
  name: string;
  props: GeneratedProp[];
}

const fixtures: string[] = [];

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    rmSync(fixture, { recursive: true, force: true });
  }
});

/** typedoc ids are unique per document; the fixture keeps them unique too. */
let nextId = 100;
function reflectionId(): number {
  return nextId++;
}

const stringType: FixtureType = { type: "intrinsic", name: "string" };

/** A typedoc property reflection, with defaults plus overrides. */
function member(
  name: string,
  {
    optional = false,
    comment,
    type = stringType,
  }: { optional?: boolean; comment?: string; type?: FixtureType } = {},
): FixtureMember {
  return {
    id: reflectionId(),
    name,
    kind: 1024,
    flags: optional ? { isOptional: true } : {},
    ...(comment
      ? { comment: { summary: [{ kind: "text", text: comment }] } }
      : {}),
    type,
  };
}

/** An inline object type: typedoc wraps it in a `reflection` declaration. */
function objectType(children: FixtureMember[]): FixtureType {
  return { type: "reflection", declaration: { children } };
}

/** A reference to a documented declaration: typedoc serializes `target` as its id. */
function reference(name: string, target: number): FixtureType {
  return { type: "reference", name, target };
}

/** A reference typedoc could not link: `target` is a source location, not an id. */
function unresolvedReference(name: string): FixtureType {
  return {
    type: "reference",
    name,
    target: {
      packageName: "@chelone/react",
      packagePath: "src/components/other.tsx",
      qualifiedName: name,
    },
  };
}

function propsInterface(
  name: string,
  children: FixtureMember[],
): FixtureDeclaration {
  return { id: reflectionId(), name, kind: 256, children };
}

function propsAlias(
  name: string,
  type: FixtureType,
  id: number = reflectionId(),
): FixtureDeclaration {
  return { id, name, kind: 2097152, type };
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
    generate(declarations: FixtureDeclaration[]) {
      writeFileSync(
        join(scripts, "public-api.typedoc.json"),
        JSON.stringify({ children: declarations }),
      );
      execFileSync(process.execPath, [script]);
    },
    props(name: string): GeneratedPropsFile {
      const file: GeneratedPropsFile = JSON.parse(
        readFileSync(join(this.propsDir, `${name}.json`), "utf-8"),
      );
      return file;
    },
  };
}

it("replaces the old props page when an exported interface is renamed", () => {
  const fixture = generatorFixture();
  fixture.generate([propsInterface("FooProps", [])]);
  expect(readdirSync(fixture.propsDir)).toEqual(["Foo.json"]);

  fixture.generate([propsInterface("BarProps", [])]);

  expect(readdirSync(fixture.propsDir)).toEqual(["Bar.json"]);
});

it("preserves the props page when an exported interface changes only case", () => {
  const fixture = generatorFixture();
  fixture.generate([propsInterface("FooProps", [])]);

  fixture.generate([propsInterface("FOOProps", [])]);

  expect(readdirSync(fixture.propsDir)).toEqual(["FOO.json"]);

  fixture.generate([propsInterface("FOOProps", [])]);

  expect(readdirSync(fixture.propsDir)).toEqual(["FOO.json"]);
});

it("removes the last props page while preserving non-JSON files", () => {
  const fixture = generatorFixture();
  fixture.generate([propsInterface("FooProps", [])]);
  writeFileSync(join(fixture.propsDir, "README.md"), "Generated props pages\n");

  fixture.generate([]);

  expect(readdirSync(fixture.propsDir)).toEqual(["README.md"]);
});

it("lists the props of a plain interface", () => {
  const fixture = generatorFixture();
  fixture.generate([
    propsInterface("FooProps", [
      member("source"),
      member("title", { optional: true, comment: "Shown in the header." }),
    ]),
  ]);

  expect(fixture.props("Foo")).toEqual({
    name: "Foo",
    props: [
      { name: "source", type: "string", optional: false, comment: "" },
      {
        name: "title",
        type: "string",
        optional: true,
        comment: "Shown in the header.",
      },
    ],
  });
});

it("lists the props of an alias to an inline object type", () => {
  const fixture = generatorFixture();
  fixture.generate([
    propsAlias(
      "FooProps",
      objectType([member("source"), member("title", { optional: true })]),
    ),
  ]);

  expect(fixture.props("Foo").props.map((p) => p.name)).toEqual([
    "source",
    "title",
  ]);
});

it("follows an alias whose type is a reference to the declaration it names", () => {
  const series = propsAlias(
    "SeriesChartProps",
    objectType([
      member("data", {
        type: {
          type: "array",
          elementType: unresolvedReference("TRow"),
        },
      }),
      member("title", { optional: true, comment: "Shown in the card header." }),
    ]),
  );
  const fixture = generatorFixture();
  fixture.generate([
    series,
    propsAlias("BarChartProps", reference("SeriesChartProps", series.id)),
  ]);

  expect(fixture.props("BarChart")).toEqual({
    name: "BarChart",
    props: [
      { name: "data", type: "TRow[]", optional: false, comment: "" },
      {
        name: "title",
        type: "string",
        optional: true,
        comment: "Shown in the card header.",
      },
    ],
  });
});

it("collects the props of each part of an intersection", () => {
  const series = propsAlias(
    "SeriesChartProps",
    objectType([member("data"), member("title", { optional: true })]),
  );
  const fixture = generatorFixture();
  fixture.generate([
    series,
    propsAlias("TrendChartProps", {
      type: "intersection",
      types: [
        reference("SeriesChartProps", series.id),
        objectType([
          member("area", {
            optional: true,
            type: { type: "intrinsic", name: "boolean" },
            comment: "Fills the area under the line.",
          }),
        ]),
      ],
    }),
  ]);

  expect(fixture.props("TrendChart")).toEqual({
    name: "TrendChart",
    props: [
      { name: "data", type: "string", optional: false, comment: "" },
      { name: "title", type: "string", optional: true, comment: "" },
      {
        name: "area",
        type: "boolean",
        optional: true,
        comment: "Fills the area under the line.",
      },
    ],
  });
});

it("keeps the later part of an intersection when a prop name repeats", () => {
  const base = propsAlias(
    "BaseProps",
    objectType([member("title", { optional: true })]),
  );
  const fixture = generatorFixture();
  fixture.generate([
    base,
    propsAlias("FooProps", {
      type: "intersection",
      types: [
        reference("BaseProps", base.id),
        objectType([
          member("title", {
            optional: true,
            type: { type: "intrinsic", name: "number" },
          }),
        ]),
      ],
    }),
  ]);

  expect(fixture.props("Foo").props).toEqual([
    { name: "title", type: "number", optional: true, comment: "" },
  ]);
});

it("leaves a reference typedoc could not link out of the table", () => {
  const fixture = generatorFixture();
  fixture.generate([
    propsAlias("FooProps", {
      type: "intersection",
      types: [
        unresolvedReference("ComponentProps"),
        objectType([member("source")]),
      ],
    }),
  ]);

  expect(fixture.props("Foo").props.map((p) => p.name)).toEqual(["source"]);
});

it("stops at a reference cycle between two aliases", () => {
  const firstId = reflectionId();
  const second = propsAlias("SecondProps", {
    type: "intersection",
    types: [
      reference("FirstProps", firstId),
      objectType([member("second", { optional: true })]),
    ],
  });
  const first = propsAlias(
    "FirstProps",
    {
      type: "intersection",
      types: [
        reference("SecondProps", second.id),
        objectType([member("first", { optional: true })]),
      ],
    },
    firstId,
  );
  const fixture = generatorFixture();
  fixture.generate([first, second]);

  expect(fixture.props("First").props.map((p) => p.name)).toEqual([
    "second",
    "first",
  ]);
});
