// @vitest-environment node

/**
 * The `rsc` entry is for React Server Components, which may call no hook and
 * create no context. A server component may still render a client one, so the
 * walk stops at a file that opens with `"use client"`.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const src = fileURLToPath(new URL(".", import.meta.url));
const rscFolder = resolve(src, "components/rsc");
const fixtures = resolve(rscFolder, "__fixtures__");

const ALIASES: Record<string, string> = {
  "@/components/": resolve(src, "components"),
  "@/lib/": resolve(src, "lib"),
  "@/hooks/": resolve(src, "hooks"),
};

const EXTENSIONS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

/** The file a relative or `@/` specifier names, or undefined for a package. */
function resolveLocal(from: string, specifier: string): string | undefined {
  let base: string | undefined;
  if (specifier.startsWith(".")) base = resolve(dirname(from), specifier);
  for (const [prefix, folder] of Object.entries(ALIASES)) {
    if (specifier.startsWith(prefix)) {
      base = join(folder, specifier.slice(prefix.length));
    }
  }
  if (base === undefined) return undefined;
  for (const extension of EXTENSIONS) {
    const candidate = `${base}${extension}`;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`${relative(src, from)}: cannot resolve "${specifier}"`);
}

interface StaticImport {
  specifier: string;
  /** The runtime names it binds or re-exports; type-only names are erased. */
  names: string[];
  /** A default or namespace binding, read as `<binding>.<member>`. */
  objectBinding?: string;
}

function staticImports(file: ts.SourceFile): StaticImport[] {
  const found: StaticImport[] = [];
  for (const statement of file.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const clause = statement.importClause;
      if (clause?.isTypeOnly) continue;
      const bindings = clause?.namedBindings;
      found.push({
        specifier: statement.moduleSpecifier.text,
        names:
          bindings && ts.isNamedImports(bindings)
            ? bindings.elements
                .filter((element) => !element.isTypeOnly)
                .map((element) => (element.propertyName ?? element.name).text)
            : [],
        objectBinding:
          bindings && ts.isNamespaceImport(bindings)
            ? bindings.name.text
            : clause?.name?.text,
      });
    }
    if (
      ts.isExportDeclaration(statement) &&
      !statement.isTypeOnly &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const clause = statement.exportClause;
      found.push({
        specifier: statement.moduleSpecifier.text,
        names:
          clause && ts.isNamedExports(clause)
            ? clause.elements
                .filter((element) => !element.isTypeOnly)
                .map((element) => (element.propertyName ?? element.name).text)
            : [],
      });
    }
  }
  return found;
}

/** Every `<object>.<member>` the file reads. */
function memberReads(file: ts.SourceFile, object: string): string[] {
  const members: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === object
    ) {
      members.push(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return members;
}

const isHookOrContext = (name: string) =>
  name === "use" || /^use[A-Z]/.test(name) || name === "createContext";

const isHooksModule = (path: string) =>
  /(^|-)hooks\.tsx?$/.test(relative(src, path).split("/").pop() ?? "") ||
  relative(src, path).startsWith("hooks/");

const opensWithUseClient = (source: string) =>
  /^\s*["']use client["'];?\s*$/.test(source.split("\n")[0] ?? "");

/**
 * Walk the static imports from `entry`, following relative and `@/` paths, and
 * return each file it reached.
 */
function walk(entry: string, stopAtUseClient: boolean) {
  const seen = new Map<string, ts.SourceFile>();
  const queue = [entry];
  while (queue.length > 0) {
    const path = queue.pop();
    if (path === undefined || seen.has(path)) continue;
    const source = readFileSync(path, "utf8");
    const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest);
    seen.set(path, file);
    if (stopAtUseClient && path !== entry && opensWithUseClient(source)) {
      continue;
    }
    for (const { specifier } of staticImports(file)) {
      const next = resolveLocal(path, specifier);
      if (next !== undefined) queue.push(next);
    }
  }
  return seen;
}

/** What a server component may not import, from each file the walk reached. */
function serverOffences(entry: string): string[] {
  const offences: string[] = [];
  for (const [path, file] of walk(entry, true)) {
    if (path !== entry && opensWithUseClient(file.text)) continue;
    const at = relative(src, path);
    for (const imported of staticImports(file)) {
      const target = resolveLocal(path, imported.specifier);
      if (target !== undefined && isHooksModule(target)) {
        offences.push(`${at} imports ${imported.specifier}`);
      }
      if (imported.specifier !== "react") continue;
      for (const name of imported.names.filter(isHookOrContext)) {
        offences.push(`${at} imports ${name} from react`);
      }
      if (imported.objectBinding === undefined) continue;
      for (const name of memberReads(file, imported.objectBinding)) {
        if (isHookOrContext(name)) offences.push(`${at} reads react.${name}`);
      }
    }
  }
  return offences;
}

/** Every source file in a folder and below it, tests and fixtures aside. */
function sourceFiles(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__fixtures__" ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) && !/\.test(-d)?\.tsx?$/.test(entry.name)
      ? [path]
      : [];
  });
}

describe("the rsc entry", () => {
  it("exports the server fields, the server list and their helpers", async () => {
    const entry = await import("./rsc");
    expect(Object.keys(entry).sort()).toEqual([
      "ServerBooleanField",
      "ServerCurrencyField",
      "ServerDateField",
      "ServerEmailField",
      "ServerFileField",
      "ServerImageField",
      "ServerList",
      "ServerListDeleteButton",
      "ServerListFilters",
      "ServerNumberField",
      "ServerRatingField",
      "ServerSelectField",
      "ServerTextField",
      "ServerUrlField",
      "readFieldValue",
      "serverEmptyText",
    ]);
  });

  it("no server file in components/rsc reaches a React hook, createContext or a hooks module", () => {
    // A client file there is one a server file renders, and may call hooks.
    const files = sourceFiles(rscFolder).filter(
      (file) => !opensWithUseClient(readFileSync(file, "utf8")),
    );
    // Guards the walk: an empty list would pass vacuously.
    expect(files.map((file) => relative(src, file))).toEqual(
      expect.arrayContaining([
        "components/rsc/read-field-value.ts",
        "components/rsc/server-scalar-fields.tsx",
        "components/rsc/server-link-fields.tsx",
        "components/rsc/server-list.tsx",
        "components/rsc/server-value-fields.tsx",
      ]),
    );
    for (const client of [
      "components/rsc/server-list-link.tsx",
      "components/rsc/server-list-filters.tsx",
      "components/rsc/server-list-delete-button.tsx",
    ]) {
      expect(files.map((file) => relative(src, file))).not.toContain(client);
    }
    expect(files.flatMap(serverOffences)).toEqual([]);
  });

  it("the walk finds a useState import", () => {
    expect(serverOffences(resolve(fixtures, "imports-a-hook.ts"))).toEqual([
      "components/rsc/__fixtures__/imports-a-hook.ts imports useState from react",
    ]);
  });

  it("the walk follows a relative import to a hook", () => {
    expect(serverOffences(resolve(fixtures, "reaches-a-hook.ts"))).toEqual([
      "components/rsc/__fixtures__/imports-a-hook.ts imports useState from react",
    ]);
  });

  it('the walk stops at a "use client" file', () => {
    expect(
      serverOffences(resolve(fixtures, "renders-a-client-file.ts")),
    ).toEqual([]);
  });

  it("the main entry imports neither src/rsc.ts nor anything under components/rsc", () => {
    const reached = [...walk(resolve(src, "index.ts"), false).keys()].map(
      (path) => relative(src, path),
    );
    // Guards the walk: it must reach past the entry file.
    expect(reached).toContain("components/admin/fields/text-field.tsx");
    expect(
      reached.filter(
        (path) => path === "rsc.ts" || path.startsWith("components/rsc/"),
      ),
    ).toEqual([]);
  });
});
