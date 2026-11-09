// Every export typed by the resource registry is named on a Type Safety page.
//
// A row is `@chelone/<package>:<export>`. An export is a row when its own
// signature names one of the registry's root types, import aliases followed.
// Dependence is not followed through another export: a component whose props
// name only `SourceProp` sits one step below `SourcePath` and is not a row.
//
// type-docs.json maps a page slug under `apps/website/src/docs/content/type-safety/`
// to the rows that page names. type-docs-baseline.json holds the rows no page
// names yet, under the page that will. Both files carry a key for every planned
// page from the start, so a page ticket edits only its own block.
//
//   pnpm check:type-docs                  compare with origin/main
//   pnpm check:type-docs --base HEAD^1    compare with another commit (what CI runs)
//   pnpm check:type-docs --update         rewrite both files from the tree
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ts = createRequire(import.meta.url)("typescript");
const { readConfigFile, parseJsonConfigFileContent, sys } = ts;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(root, "apps/website/src/docs/content/type-safety");
const docsPath = path.join(root, "type-docs.json");
const baselinePath = path.join(root, "type-docs-baseline.json");

/** The entries the check reads, each with its own tsconfig.json. */
export const PACKAGES = ["core", "react", "vue", "supabase"];

/** The registry's own types: what an app's `Register` augmentation reaches. */
export const ROOT_TYPES = new Set([
  "Register",
  "RegisteredResources",
  "RegisteredResourceName",
  "RegisteredRecord",
  "RegisteredPermissions",
  "RegisteredMessages",
  "RegisteredLiteralMessages",
  "ResourceMap",
  "RecordOf",
  "SourcePath",
  "AnySourcePath",
  "AnySourcePathOf",
]);

/** Where the root types are declared, so a same-named type elsewhere is not one. */
const ROOT_FOLDER = /(^|\/)packages\/core\/src\/resource\/[^/]+\.tsx?$/;

const byCodeUnit = (x, y) => (x < y ? -1 : x > y ? 1 : 0);

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`;

/** @typedef {Record<string, string[]>} RowsByPage rows by page slug */

export function readBase(args) {
  const flag = args.indexOf("--base");
  return flag === -1 ? "origin/main" : args[flag + 1];
}

/** The export half of a row. */
export function exportName(row) {
  return row.slice(row.indexOf(":") + 1);
}

/** The page's text, or null when the page file is missing. */
export function pageText(slug) {
  for (const ext of [".mdx", ".md"]) {
    const file = path.join(docsDir, `${slug}${ext}`);
    if (existsSync(file)) return readFileSync(file, "utf8");
  }
  return null;
}

/** Whether a page names `name` as a whole word, `RowSourcePath` being no `SourcePath`. */
export function pageMentions(text, name) {
  const word = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![A-Za-z0-9_$])${word}(?![A-Za-z0-9_$])`).test(text);
}

// ---------------------------------------------------------------------------
// Reading the dependence out of the tree
// ---------------------------------------------------------------------------

const NAMED = new Set([
  ts.SyntaxKind.Identifier,
  ts.SyntaxKind.QualifiedName,
  ts.SyntaxKind.PropertyAccessExpression,
]);

/** Everything a type node names, with import aliases left for the caller to follow. */
function collectNames(node, sourceFile, out) {
  if (!node) return;
  if (NAMED.has(node.kind)) {
    const symbol =
      typeChecker.getSymbolAtLocation(node) ?? (node.right ? typeChecker.getSymbolAtLocation(node.right) : undefined);
    if (symbol) out.push(symbol);
    if (node.kind === ts.SyntaxKind.QualifiedName) collectNames(node.left, sourceFile, out);
    return;
  }
  for (const child of node.getChildren(sourceFile)) collectNames(child, sourceFile, out);
}

/** Nodes whose own signature is read, and whose body is never walked. */
const SIGNATURE = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.MethodSignature,
  ts.SyntaxKind.CallSignature,
  ts.SyntaxKind.ConstructSignature,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.FunctionType,
  ts.SyntaxKind.ConstructorType,
]);

/** Nodes read through their annotation, constraint, default or initializer. */
const ANNOTATED = new Set([
  ts.SyntaxKind.Parameter,
  ts.SyntaxKind.TypeParameter,
  ts.SyntaxKind.PropertyDeclaration,
  ts.SyntaxKind.PropertySignature,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
  ts.SyntaxKind.VariableDeclaration,
  ts.SyntaxKind.IndexSignature,
]);

/** Nodes read through their type parameters, heritage clauses and members. */
const DECLARATIONS = new Set([
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.TypeAliasDeclaration,
  ts.SyntaxKind.VariableStatement,
  ts.SyntaxKind.VariableDeclarationList,
  ts.SyntaxKind.ModuleDeclaration,
]);

const isTypeNode = (node) => ts.isTypeNode(node);

let typeChecker;

/**
 * The types a declaration's signature names: its type parameters, parameters,
 * return type, members, heritage clauses, annotations, the initializer of a
 * const whose value is a function (where that function's signature lives), and
 * the type arguments written on a call in one. A function body is never walked,
 * so a type used only inside one does not count.
 */
function signatureNames(declaration) {
  const sourceFile = declaration.getSourceFile();
  const out = [];
  const visit = (node) => {
    if (!node) return;
    if (SIGNATURE.has(node.kind)) {
      for (const parameter of node.typeParameters ?? []) visit(parameter);
      for (const parameter of node.parameters ?? []) visit(parameter);
      visit(node.type);
      visit(node.returnType);
      return;
    }
    if (ANNOTATED.has(node.kind)) {
      visit(node.type);
      visit(node.constraint);
      visit(node.default);
      // `export const useFoo = <T extends RegisteredResourceName>(r: T) => r`
      // carries its signature in the initializer, with no annotation to read.
      visit(node.initializer);
      return;
    }
    if (DECLARATIONS.has(node.kind)) {
      for (const parameter of node.typeParameters ?? []) visit(parameter);
      for (const clause of node.heritageClauses ?? []) visit(clause);
      for (const member of node.members ?? []) visit(member);
      visit(node.type);
      if (node.declarationList) visit(node.declarationList);
      return;
    }
    if (node.kind === ts.SyntaxKind.CallExpression || node.kind === ts.SyntaxKind.NewExpression) {
      for (const type of node.typeArguments ?? []) collectNames(type, sourceFile, out);
      return;
    }
    if (node.kind === ts.SyntaxKind.HeritageClause) {
      for (const clause of node.types) collectNames(clause, sourceFile, out);
      return;
    }
    if (isTypeNode(node)) collectNames(node, sourceFile, out);
  };
  visit(declaration);
  return out;
}

/** Whether a symbol, aliases followed, is one of the registry's root types. */
function isRootType(symbol) {
  const name = symbol.escapedName;
  if (typeof name !== "string" || !ROOT_TYPES.has(name)) return false;
  const followed = symbol.flags & ts.SymbolFlags.Alias ? typeChecker.getAliasedSymbol(symbol) : symbol;
  return (followed.declarations ?? []).some((d) => ROOT_FOLDER.test(d.getSourceFile().fileName.replace(/\\/g, "/")));
}

/**
 * The rows one entry holds: each export declared in its own package whose
 * signature names a root type, plus each root type itself. A re-export of
 * another package's symbol is left to that package's own entry, so a core
 * symbol an adapter re-exports is the core row only.
 *
 * @param {ts.TypeChecker} checker
 * @param {ts.SourceFile | undefined} entryFile
 * @param {string} packageName
 */
export function entryRows(checker, entryFile, packageName) {
  typeChecker = checker;
  if (!entryFile) throw new Error(`No source file for @chelone/${packageName}'s entry.`);
  const moduleSymbol = checker.getSymbolAtLocation(entryFile);
  if (!moduleSymbol) throw new Error(`@chelone/${packageName}'s entry has no module symbol.`);
  const ownFolder = `${path.dirname(entryFile.fileName).replace(/\\/g, "/")}/`;
  /** @type {string[]} */
  const rows = [];
  for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
    const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    const declaredHere = (target.declarations ?? []).filter((d) =>
      d.getSourceFile().fileName.replace(/\\/g, "/").startsWith(ownFolder),
    );
    if (declaredHere.length === 0) continue;
    const named = declaredHere.flatMap((d) => signatureNames(d));
    if (isRootType(target) || named.some((s) => isRootType(s))) rows.push(`@chelone/${packageName}:${symbol.name}`);
  }
  return rows.sort(byCodeUnit);
}

/** One program per entry, each read with its package's own tsconfig.json. */
function entryProgram(packageName) {
  const dir = path.join(root, "packages", packageName);
  const config = readConfigFile(path.join(dir, "tsconfig.json"), sys.readFile);
  if (config.error) throw new Error(`No tsconfig.json for @chelone/${packageName}: ${config.error.messageText}`);
  const options = parseJsonConfigFileContent(config.config, sys, dir).options;
  const entry = path.join(dir, JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8")).exports["."]);
  const program = ts.createProgram({ rootNames: [entry], options });
  return { checker: program.getTypeChecker(), entryFile: program.getSourceFile(entry) };
}

/** Every registry-dependent export in the tree, as rows in code-unit order. */
export function scanEntries() {
  return PACKAGES.flatMap((packageName) => {
    const { checker, entryFile } = entryProgram(packageName);
    return entryRows(checker, entryFile, packageName);
  }).sort(byCodeUnit);
}

// ---------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------

/** @param {RowsByPage} file @returns {Map<string, string[]>} row -> the slugs it sits under */
function rowsIn(file) {
  /** @type {Map<string, string[]>} */
  const rows = new Map();
  for (const [slug, list] of Object.entries(file)) {
    for (const row of list ?? []) {
      const slugs = rows.get(row);
      if (slugs) slugs.push(slug);
      else rows.set(row, [slug]);
    }
  }
  return rows;
}

/**
 * Every way the two files can be out of line with the tree and with the pages.
 *
 * @param {{ found: string[], docs: RowsByPage, baseline: RowsByPage,
 *   baseBaseline: RowsByPage | null, pageText: (slug: string) => string | null }} input
 *   `baseBaseline` is the baseline on the base commit, or null when it has none.
 * @returns {string[]}
 */
export function problems({ found, docs, baseline, baseBaseline, pageText }) {
  const mapped = rowsIn(docs);
  const owed = rowsIn(baseline);
  const live = new Set(found);
  const baseRows = baseBaseline === null ? null : rowsIn(baseBaseline);
  /** @type {string[]} */
  const out = [];

  for (const row of found) {
    if (!mapped.has(row) && !owed.has(row)) {
      out.push(
        `${row} is registry-dependent and named by no page: map it in type-docs.json, or list it under its page in type-docs-baseline.json`,
      );
    }
  }
  for (const [row, slugs] of mapped) {
    if (owed.has(row)) out.push(`${row} is in both type-docs.json and type-docs-baseline.json`);
    if (slugs.length > 1) out.push(`${row} is in type-docs.json twice, under ${slugs.sort(byCodeUnit).join(" and ")}`);
    if (!live.has(row)) {
      out.push(`${row} is in type-docs.json, but no export depends on a registry type through it any more`);
    }
    const text = pageText(slugs[0]);
    if (text === null) {
      out.push(`${row} maps to ${slugs[0]}, which has no page file under ${path.relative(root, docsDir)}/`);
    } else if (!pageMentions(text, exportName(row))) {
      out.push(`${row} maps to ${slugs[0]}, which never names ${exportName(row)}`);
    }
  }
  for (const [row, slugs] of owed) {
    if (slugs.length > 1) {
      out.push(`${row} is in type-docs-baseline.json twice, under ${slugs.sort(byCodeUnit).join(" and ")}`);
    }
    if (!live.has(row)) {
      out.push(`${row} is in type-docs-baseline.json, but no export depends on a registry type through it any more`);
    }
    const text = pageText(slugs[0]);
    if (text !== null && pageMentions(text, exportName(row))) {
      out.push(`${row} is in type-docs-baseline.json under ${slugs[0]}, which already names it: move it to type-docs.json`);
    }
    if (baseRows !== null && !baseRows.has(row)) {
      out.push(
        `${row} is a new baseline row: the baseline only shrinks, so a new registry-dependent export names its page in type-docs.json`,
      );
    }
  }
  return out.sort(byCodeUnit);
}

/**
 * Both files as the tree says they are: every row still owed stays under its
 * page, a row whose page names it moves to type-docs.json, and a row no export
 * depends on any more is dropped. Every page key is kept, empty or not.
 *
 * @param {{ found: string[], docs: RowsByPage, baseline: RowsByPage,
 *   pageText: (slug: string) => string | null }} input
 * @returns {{ docsText: string, baselineText: string, unassigned: string[] }}
 */
export function updateTexts({ found, docs, baseline, pageText }) {
  const live = new Set(found);
  const slugs = [...new Set([...Object.keys(docs), ...Object.keys(baseline)])].sort(byCodeUnit);
  /** @type {RowsByPage} */
  const nextDocs = {};
  /** @type {RowsByPage} */
  const nextBaseline = {};
  const assigned = new Set();
  for (const slug of slugs) {
    const text = pageText(slug);
    const fresh = (list) => (list ?? []).filter((row) => live.has(row) && !assigned.has(row));
    const keptDocs = fresh(docs[slug]);
    const keptBaseline = fresh(baseline[slug]);
    const moved = keptBaseline.filter((row) => text !== null && pageMentions(text, exportName(row)));
    const mapped = [...keptDocs, ...moved];
    const owed = keptBaseline.filter((row) => !moved.includes(row));
    for (const row of [...mapped, ...owed]) assigned.add(row);
    nextDocs[slug] = mapped.sort(byCodeUnit);
    nextBaseline[slug] = owed.sort(byCodeUnit);
  }
  return {
    docsText: jsonText(nextDocs),
    baselineText: jsonText(nextBaseline),
    unassigned: found.filter((row) => !assigned.has(row)),
  };
}

/** The baseline on `base`, or null on a commit from before it existed. */
function loadBaseBaseline(base) {
  try {
    const text = execFileSync("git", ["show", `${base}:type-docs-baseline.json`], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return /** @type {RowsByPage} */ (JSON.parse(text));
  } catch {
    return null;
  }
}

const loadRows = (file) => /** @type {RowsByPage} */ (JSON.parse(readFileSync(file, "utf8")));

function main() {
  const args = process.argv.slice(2);
  const started = Date.now();
  const docs = loadRows(docsPath);
  const baseline = loadRows(baselinePath);
  const found = scanEntries();

  if (args.includes("--update")) {
    const { docsText, baselineText, unassigned } = updateTexts({ found, docs, baseline, pageText });
    writeFileSync(docsPath, docsText);
    writeFileSync(baselinePath, baselineText);
    console.log(
      `Wrote ${found.length} registry-dependent exports to type-docs.json and type-docs-baseline.json in ${((Date.now() - started) / 1000).toFixed(1)}s.`,
    );
    if (unassigned.length > 0) {
      for (const row of unassigned) console.error(row);
      console.error(
        `\n${unassigned.length} export(s) above are in neither file. Name the page that will explain each one in type-docs-baseline.json and run --update again.`,
      );
      process.exit(1);
    }
    return;
  }

  const base = readBase(args);
  const foundProblems = problems({ found, docs, baseline, baseBaseline: loadBaseBaseline(base), pageText });
  for (const problem of foundProblems) console.error(problem);
  if (foundProblems.length > 0) {
    console.error(`\n${foundProblems.length} type-docs problem(s). The rule is in CLAUDE.md.`);
    process.exit(1);
  }
  console.log(
    `${found.length} registry-dependent exports each name a Type Safety page, in ${((Date.now() - started) / 1000).toFixed(1)}s.`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
