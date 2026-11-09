/**
 * The probe a registered test writes, and how its diagnostics come back.
 *
 * A `Register` augmentation is global to a TypeScript program, and one written
 * into a `test-d` file would change every other type test in the package. So
 * each registered test writes probe files into the package's
 * `node_modules/.cache/`, where the package's own dependencies resolve, and
 * compiles them with `ts.createProgram` — or with `vue-tsc`, the only reader of
 * a `.vue` file. The probe directory sits three levels under the package root,
 * which is why every probe imports the package as `../../../src/...`.
 *
 * The `schema-complete` pair compares its diagnostics with
 * `schema-complete-baseline.json` at the repo root, which holds one entry per
 * shipped file that fails today. The baseline only shrinks: a fix lowers its
 * entry, and a new failure fails the pin.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

/**
 * Compiler options a probe file compiles under: the repo base, emitting nothing
 * and pulling in no ambient types, so a probe sees only what it imports. A JSX
 * probe adds `jsx` itself.
 */
export const probeCompilerOptions: ts.CompilerOptions = {
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
};

/** A registered app: two resources with schemas, so a name has a record. */
export const schemaAugmentation = `import { defineResources } from "@chelone/core";
import { z } from "zod";

export const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
  comments: { schema: z.object({ id: z.number(), body: z.string() }) },
});

declare module "@chelone/core" {
  interface Register {
    resources: typeof resources;
  }
}
`;

/**
 * The same resources with no schema. Registering schemas would also narrow
 * every `source` prop, which is the `source` side's looseness and not a hook
 * test's: here only the resource names are registered.
 */
export const namesOnlyAugmentation = `import { defineResources } from "@chelone/core";

export const resources = defineResources({
  posts: {},
  comments: {},
  authors: {},
});

declare module "@chelone/core" {
  interface Register {
    resources: typeof resources;
  }
}
`;

/**
 * A registered app whose every resource has a schema, which is what a codegen'd
 * app gets (#1831), so every `source` narrows to a literal path. `media` leaves
 * its `id` to the database, as an insert schema often does.
 */
export const schemaCompleteAugmentation = `import { defineResources } from "@chelone/core";
import { z } from "zod";

export const resources = defineResources({
  posts: { schema: z.object({ id: z.number(), title: z.string() }) },
  comments: { schema: z.object({ id: z.number(), body: z.string() }) },
  media: { schema: z.object({ id: z.number().optional(), url: z.string() }) },
});

declare module "@chelone/core" {
  interface Register {
    resources: typeof resources;
  }
}
`;

/** A probe directory: write a file into it, then take the directory away. */
export interface ProbeDir {
  /** The probe directory, inside the package's `node_modules/.cache/`. */
  dir: string;
  /** Write one probe file and return its path. */
  write(name: string, text: string): Promise<string>;
  /** Remove the probe directory. */
  dispose(): Promise<void>;
}

/** A fresh probe directory under `packageRoot`, where its dependencies resolve. */
export async function createProbeDir(packageRoot: string): Promise<ProbeDir> {
  const cache = join(packageRoot, "node_modules", ".cache");
  await mkdir(cache, { recursive: true });
  const dir = await mkdtemp(join(cache, "registered-"));
  return {
    dir,
    write: async (name, text) => {
      const path = join(dir, name);
      await writeFile(path, text);
      return path;
    },
    dispose: () => rm(dir, { recursive: true, force: true }),
  };
}

/** One diagnostic, with the file and line it landed on, relative to the package. */
export interface ProbeDiagnostic {
  file: string;
  line: number;
  code: number;
  message: string;
}

/** `file:line TScode message`, the one-line form a report prints. */
export function locatedText(diagnostic: ProbeDiagnostic): string {
  return `${diagnostic.file}:${diagnostic.line} TS${diagnostic.code} ${diagnostic.message}`;
}

/**
 * A program over `fileNames`, run from `packageRoot` so the package's own
 * `types` resolve the way its `tsconfig.json` means them to: `vite/client` is
 * what declares its `*.css` imports, and it is found from the package, not from
 * wherever the test process happens to sit.
 */
const programOf = (
  fileNames: readonly string[],
  options: ts.CompilerOptions,
  packageRoot: string,
) => {
  const host = ts.createCompilerHost(options, true);
  host.getCurrentDirectory = () => packageRoot;
  return ts.createProgram({ rootNames: fileNames, options, host });
};

const located = (
  diagnostics: readonly ts.Diagnostic[],
  packageRoot: string,
): ProbeDiagnostic[] =>
  diagnostics.map((diagnostic) => ({
    file: diagnostic.file
      ? relative(packageRoot, diagnostic.file.fileName)
      : "<none>",
    line:
      diagnostic.file && diagnostic.start !== undefined
        ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line +
          1
        : 0,
    code: diagnostic.code,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
  }));

/** Every diagnostic of a whole program, flattened to text. */
export function diagnosticsOf(
  fileNames: readonly string[],
  options: ts.CompilerOptions,
  packageRoot: string,
): string[] {
  return ts
    .getPreEmitDiagnostics(programOf(fileNames, options, packageRoot))
    .map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    );
}

/**
 * One probe file's own diagnostics, not the whole program's. A probe drags in
 * the modules it imports and everything they import, and checking all of that
 * is the sources case's job; here the question is only what the probe's own
 * calls do.
 */
export function probeDiagnosticsOf(
  probe: string,
  fileNames: readonly string[],
  options: ts.CompilerOptions,
  packageRoot: string,
): string[] {
  const program = programOf(fileNames, options, packageRoot);
  const source = program.getSourceFile(probe);
  if (!source) throw new Error(`The probe ${probe} is not in the program.`);
  return [
    ...program.getSyntacticDiagnostics(source),
    ...program.getSemanticDiagnostics(source),
  ].map((diagnostic) =>
    ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
  );
}

/** Every diagnostic of a whole program, each with its file and line. */
export function locatedDiagnosticsOf(
  fileNames: readonly string[],
  options: ts.CompilerOptions,
  packageRoot: string,
): ProbeDiagnostic[] {
  return located(
    ts.getPreEmitDiagnostics(programOf(fileNames, options, packageRoot)),
    packageRoot,
  );
}

/** The package's own program, and the shipped sources it checks. */
export interface PackageProgram {
  options: ts.CompilerOptions;
  /** Test files and their fixtures are out: they mount fake resources on purpose. */
  sources: string[];
}

/**
 * The package's `tsconfig.json` read the way `tsc` reads it, emitting nothing so
 * a probe file can sit outside `src`.
 */
export function packageProgramOf(packageRoot: string): PackageProgram {
  const read = ts.readConfigFile(
    join(packageRoot, "tsconfig.json"),
    ts.sys.readFile,
  );
  if (read.error) {
    throw new Error(
      ts.flattenDiagnosticMessageText(read.error.messageText, "\n"),
    );
  }
  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    packageRoot,
  );
  return {
    options: {
      ...parsed.options,
      rootDir: packageRoot,
      noEmit: true,
      declaration: false,
    },
    sources: parsed.fileNames.filter(
      (file) =>
        !/\.test(-d)?\.tsx?$/.test(file) &&
        !file.endsWith(".d.ts") &&
        !/\/__fixtures__\//.test(file),
    ),
  };
}

/** A diagnostic line: `file(line,col): error TScode message`. */
const DIAGNOSTIC_LINE = /^(.+)\((\d+),(\d+)\): error TS(\d+): (.*)$/;

/**
 * A match for {@link DIAGNOSTIC_LINE} carries five groups, so six slots.
 * `RegExpExecArray` is an `Array<string>`, which says nothing of the count.
 */
const hasFiveGroups = (
  match: RegExpExecArray,
): match is RegExpExecArray &
  [string, string, string, string, string, string] => match.length === 6;

/**
 * `vue-tsc --noEmit` over a probe tsconfig, so the `.vue` components are read.
 * `--pretty false` prints one {@link DIAGNOSTIC_LINE} per diagnostic, with a
 * long message continued on indented lines.
 */
export function vueTscDiagnosticsOf(
  packageRoot: string,
  tsconfigPath: string,
): ProbeDiagnostic[] {
  const run = spawnSync(
    join(packageRoot, "node_modules", ".bin", "vue-tsc"),
    ["-p", tsconfigPath, "--noEmit", "--pretty", "false"],
    { cwd: packageRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  if (run.error) throw run.error;
  const diagnostics: ProbeDiagnostic[] = [];
  const stray: string[] = [];
  for (const line of run.stdout.split("\n")) {
    const match = DIAGNOSTIC_LINE.exec(line);
    if (match && hasFiveGroups(match)) {
      const [, file, at, , code, message] = match;
      diagnostics.push({
        file: relative(packageRoot, join(packageRoot, file)),
        line: Number(at),
        code: Number(code),
        message,
      });
      continue;
    }
    if (line.trim() === "") continue;
    const last = diagnostics[diagnostics.length - 1];
    if (line.startsWith("  ") && last) last.message += `\n${line.trim()}`;
    else stray.push(line);
  }
  if (stray.length > 0) {
    throw new Error(
      `vue-tsc said something no diagnostic line explains:\n${stray.join("\n")}\n${run.stderr}`,
    );
  }
  return diagnostics;
}

/** Which side of `schema-complete-baseline.json` a run is checked against. */
export type SchemaCompleteSide = "react" | "vue";

/** Each shipped file that fails today, and how many diagnostics it fails with. */
export type SchemaCompleteBaseline = Record<
  SchemaCompleteSide,
  Record<string, number>
>;

/** The repo's baseline, next to the other baselines at the root. */
export const schemaCompleteBaselinePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "schema-complete-baseline.json",
);

/** The repo's `schema-complete-baseline.json`. */
export function readSchemaCompleteBaseline(): SchemaCompleteBaseline {
  const sides = (value: unknown): value is SchemaCompleteBaseline =>
    typeof value === "object" &&
    value !== null &&
    Object.entries(value).length === 2 &&
    Object.entries(value).every(
      ([side, counts]) =>
        (side === "react" || side === "vue") &&
        typeof counts === "object" &&
        counts !== null &&
        Object.values(counts).every((count) => typeof count === "number"),
    );
  const parsed = JSON.parse(readFileSync(schemaCompleteBaselinePath, "utf8"));
  if (!sides(parsed)) {
    throw new Error(
      `${schemaCompleteBaselinePath} is not { react: { file: count }, vue: { file: count } }.`,
    );
  }
  return parsed;
}

/**
 * Compare a run's diagnostics with the baseline, grouped by file. An empty array
 * is a pass.
 *
 * A file the baseline does not list, or one over its entry, fails with its
 * diagnostics printed. A file under its entry fails too: the baseline only
 * shrinks, so a fix brings its entry down with it.
 */
export function baselineDiff(
  side: SchemaCompleteSide,
  diagnostics: readonly ProbeDiagnostic[],
  baseline: SchemaCompleteBaseline,
): string[] {
  const entries = baseline[side];
  const grouped = new Map<string, ProbeDiagnostic[]>();
  for (const diagnostic of diagnostics) {
    const list = grouped.get(diagnostic.file);
    if (list) list.push(diagnostic);
    else grouped.set(diagnostic.file, [diagnostic]);
  }
  const failure = (
    file: string,
    list: readonly ProbeDiagnostic[],
    why: string,
  ) => `${side}: ${file} ${why}\n${list.map(locatedText).join("\n")}`;
  const failures: string[] = [];
  for (const [file, list] of grouped) {
    const entry = entries[file];
    if (entry === undefined) {
      failures.push(
        failure(
          file,
          list,
          `is not in ${basename(schemaCompleteBaselinePath)}:`,
        ),
      );
    } else if (list.length > entry) {
      failures.push(failure(file, list, `is over its entry of ${entry}:`));
    } else if (list.length < entry) {
      failures.push(
        failure(
          file,
          list,
          `is under its entry of ${entry}: lower the entry or drop it.`,
        ),
      );
    }
  }
  for (const [file, entry] of Object.entries(entries)) {
    if (!grouped.has(file)) {
      failures.push(
        `${side}: ${file} holds ${entry} in ${basename(schemaCompleteBaselinePath)} and none in the run: lower the entry or drop it.`,
      );
    }
  }
  return failures.sort();
}
