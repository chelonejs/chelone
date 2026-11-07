import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { runGen } from "./cli";

// The shape `supabase gen types typescript` writes, trimmed to what matters.
// Its recursive `Json` is left out: supazod writes a self-referential `jsonSchema`
// that fails `noImplicitAny`, and the compile test below needs no diagnostics.
const typesText = (
  extraPublicTables = "",
) => `export type Json = string | number | boolean | null

export type Database = {
  public: {
    Tables: {
      authors: {
        Row: { id: string; name: string }
        Insert: { id?: string; name: string }
        Update: { id?: string; name?: string }
        Relationships: []
      }
      posts: {
        Row: { id: number; author_id: string; title: string }
        Insert: { id?: number; author_id: string; title: string }
        Update: { id?: number; author_id?: string; title?: string }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
        ]
      }${extraPublicTables}
    }
    Views: {
      published_posts: {
        Row: { id: number | null; title: string | null }
        Relationships: []
      }
    }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
  other: {
    Tables: {
      notes: {
        Row: { id: number; body: string }
        Insert: { id?: number; body: string }
        Update: { id?: number; body?: string }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
`;

// supazod names this table's schema from its accents, where the resources file
// names it from the ASCII letters alone, so supazod never exports the name asked for.
const accentedTable = `
      café: {
        Row: { id: number }
        Insert: { id?: number }
        Update: { id?: number }
        Relationships: []
      }`;

// Inside the package, so the files the command writes resolve `zod` and `@chelone/core`.
const scratchRoot = fileURLToPath(
  new URL("../../node_modules/.cache/", import.meta.url),
);

const run = async (argv: string[], cwd: string) => {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runGen(argv, {
    stdout: (text) => out.push(text),
    stderr: (text) => err.push(text),
    cwd,
  });
  return { code, stdout: out.join(""), stderr: err.join("") };
};

const exists = (path: string) =>
  readFile(path).then(
    () => true,
    () => false,
  );

describe("runGen", () => {
  let dir: string;

  // `runGen` reaches `supazod` and `./database-relations` (which imports
  // `typescript`) through dynamic imports on its first call, so the first test
  // pays for those cold loads. Release's Check runs every package's tests
  // uncached and in parallel, which outran vitest's 5s default there. Warm them
  // in a hook, where a slow load has room; Node's own module cache keeps the two
  // packages loaded across the `vi.resetModules()` below, and re-evaluating
  // `./database-relations` after a reset is cheap.
  beforeAll(async () => {
    await Promise.all([
      import("supazod"),
      import("typescript"),
      import("./database-relations"),
    ]);
  }, 30_000);

  beforeEach(async () => {
    await mkdir(scratchRoot, { recursive: true });
    dir = await mkdtemp(join(scratchRoot, "gen-"));
    await writeFile(join(dir, "database.types.ts"), typesText());
  });

  afterEach(async () => {
    vi.doUnmock("supazod");
    vi.doUnmock("typescript");
    vi.resetModules();
    await rm(dir, { recursive: true, force: true });
  });

  it("writes schemas.ts and resources.ts for the fixture and exits 0", async () => {
    const { code, stdout, stderr } = await run(
      ["gen", "--input", "database.types.ts", "--out-dir", "generated"],
      dir,
    );

    expect(stderr).toBe("");
    expect(code).toBe(0);
    expect(stdout).toContain(join(dir, "generated", "schemas.ts"));
    expect(stdout).toContain(join(dir, "generated", "resources.ts"));
    expect(stdout).not.toContain("<Resource");
    const schemas = await readFile(
      join(dir, "generated", "schemas.ts"),
      "utf8",
    );
    expect(schemas).toContain("export const publicPostsRowSchema");
    expect(schemas).toContain("export const publicPublishedPostsRowSchema");
    const resources = await readFile(
      join(dir, "generated", "resources.ts"),
      "utf8",
    );
    expect(resources).toContain('from "./schemas"');
    expect(resources).toContain('references: { author_id: "authors" }');
  });

  it("overwrites both files on the next run", async () => {
    await mkdir(join(dir, "generated"));
    await writeFile(join(dir, "generated", "schemas.ts"), "stale");
    await writeFile(join(dir, "generated", "resources.ts"), "stale");

    const { code } = await run(
      ["gen", "--input", "database.types.ts", "--out-dir", "generated"],
      dir,
    );

    expect(code).toBe(0);
    for (const file of ["schemas.ts", "resources.ts"]) {
      expect(await readFile(join(dir, "generated", file), "utf8")).not.toBe(
        "stale",
      );
    }
  });

  it("the written files compile against @chelone/core with no diagnostics", async () => {
    await run(
      ["gen", "--input", "database.types.ts", "--out-dir", "generated"],
      dir,
    );

    const program = ts.createProgram(
      [
        join(dir, "generated", "schemas.ts"),
        join(dir, "generated", "resources.ts"),
      ],
      {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        noUncheckedIndexedAccess: true,
        verbatimModuleSyntax: true,
        isolatedModules: true,
        types: [],
      },
    );
    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      );

    expect(diagnostics).toEqual([]);
    // A cold program type-checks @chelone/core and zod, which outruns vitest's 5s default on a CI runner.
  }, 60_000);

  it("--schema picks the schema and --scaffold vue prints Vue elements", async () => {
    const { code, stdout } = await run(
      [
        "gen",
        "--input",
        "database.types.ts",
        "--out-dir",
        "generated",
        "--schema",
        "other",
        "--scaffold",
        "vue",
      ],
      dir,
    );

    expect(code).toBe(0);
    const resources = await readFile(
      join(dir, "generated", "resources.ts"),
      "utf8",
    );
    expect(resources).toContain("otherNotesRowSchema");
    expect(resources).not.toContain("publicPostsRowSchema");
    expect(stdout).toContain('<Resource\n  name="notes"');
    expect(stdout).toContain(':list="ListGuesser"');
    expect(stdout).toContain(':edit="EditGuesser"');
    expect(stdout.indexOf("resources.ts")).toBeLessThan(
      stdout.indexOf("<Resource"),
    );
  });

  it("--scaffold react prints React elements", async () => {
    const { code, stdout } = await run(
      [
        "gen",
        "--input",
        "database.types.ts",
        "--out-dir",
        "generated",
        "--scaffold",
        "react",
      ],
      dir,
    );

    expect(code).toBe(0);
    expect(stdout).toContain("list={ListGuesser}");
  });

  it("--help prints the usage and exits 0", async () => {
    for (const argv of [["--help"], ["gen", "--help"]]) {
      const { code, stdout, stderr } = await run(argv, dir);

      expect(code).toBe(0);
      expect(stderr).toBe("");
      expect(stdout).toContain("chelone-supabase gen --input");
      expect(stdout).toContain("--out-dir");
      expect(stdout).toContain("--scaffold");
    }
  });

  it("a missing input or unknown option prints one line and exits 1", async () => {
    const cases = [
      ["gen", "--out-dir", "generated"],
      ["gen", "--input", "database.types.ts"],
      ["gen", "--input", "database.types.ts", "--out-dir", "g", "--nope"],
      [
        "gen",
        "--input",
        "database.types.ts",
        "--out-dir",
        "g",
        "--scaffold",
        "svelte",
      ],
      ["gen", "--input", "missing.ts", "--out-dir", "g"],
      [
        "gen",
        "--input",
        "database.types.ts",
        "--out-dir",
        "g",
        "--schema",
        "nope",
      ],
      ["build"],
      [],
    ];
    for (const argv of cases) {
      const { code, stdout, stderr } = await run(argv, dir);

      expect(code, argv.join(" ")).toBe(1);
      expect(stdout, argv.join(" ")).toBe("");
      expect(stderr.trimEnd().split("\n"), argv.join(" ")).toHaveLength(1);
      expect(stderr, argv.join(" ")).not.toMatch(/\n\s+at /);
    }
    expect(await exists(join(dir, "g", "resources.ts"))).toBe(false);
  });

  it("a missing supazod says how to add it and exits 1", async () => {
    vi.resetModules();
    vi.doMock("supazod", () => {
      throw new Error("Cannot find package 'supazod'");
    });
    const { runGen: runWithoutSupazod } = await import("./cli");
    const err: string[] = [];

    const code = await runWithoutSupazod(
      ["gen", "--input", "database.types.ts", "--out-dir", "generated"],
      { stdout: () => {}, stderr: (text) => err.push(text), cwd: dir },
    );

    expect(code).toBe(1);
    expect(err.join("")).toMatch(/add `supazod` as a dev dependency/);
    expect(err.join("").trimEnd().split("\n")).toHaveLength(1);
    expect(await exists(join(dir, "generated", "resources.ts"))).toBe(false);
  });

  it("a missing typescript says how to add it and exits 1, and --help still works", async () => {
    vi.resetModules();
    vi.doMock("typescript", () => {
      throw new Error("Cannot find package 'typescript'");
    });
    const { runGen: runWithoutTypescript } = await import("./cli");
    const withoutTypescript = async (argv: string[]) => {
      const out: string[] = [];
      const err: string[] = [];
      const code = await runWithoutTypescript(argv, {
        stdout: (text) => out.push(text),
        stderr: (text) => err.push(text),
        cwd: dir,
      });
      return { code, stdout: out.join(""), stderr: err.join("") };
    };

    const help = await withoutTypescript(["--help"]);
    const gen = await withoutTypescript([
      "gen",
      "--input",
      "database.types.ts",
      "--out-dir",
      "generated",
    ]);

    expect(help.code).toBe(0);
    expect(gen.code).toBe(1);
    expect(gen.stderr).toMatch(/add `typescript` as a dev dependency/);
    expect(gen.stderr.trimEnd().split("\n")).toHaveLength(1);
    expect(await exists(join(dir, "generated", "resources.ts"))).toBe(false);
  });

  it("a relation supazod did not export leaves no resources.ts and exits 1", async () => {
    await writeFile(join(dir, "database.types.ts"), typesText(accentedTable));

    const { code, stderr } = await run(
      ["gen", "--input", "database.types.ts", "--out-dir", "generated"],
      dir,
    );

    expect(code).toBe(1);
    expect(stderr).toContain("café");
    expect(stderr.trimEnd().split("\n")).toHaveLength(1);
    expect(await exists(join(dir, "generated", "resources.ts"))).toBe(false);
    expect(await exists(join(dir, "generated", "schemas.ts"))).toBe(false);
  });
});
