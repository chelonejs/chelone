// Fails when a change adds a type escape. Each file's count per kind is compared
// with the same file at a base commit, so removed escapes pass and there is no
// baseline file to keep. Escapes are parsed with TypeScript (Vue files by their
// <script> blocks), so the count does not move when unrelated lines do.
//
// A site is not counted when its line, or the line above, carries a
// `// type-escape: <why>` comment. That is the way to add a justified escape.
//
// `unknown-cast` is the exception: a cast from an `unknown` value, `(meta ?? {}) as T` included,
// or to a function taking `unknown`. It is a double cast split across two statements, so no comment
// excuses it. Finding it needs the checker, so it reads each package's program, and a tree with no
// installed dependencies (the pre-push hook's) skips that half with a warning. `.vue` files are
// outside those programs, so there only the cast to a function is seen.
//
// `loose-bound` is the other exception: a type parameter bounded by `LooseRecord`,
// `<TRecord extends LooseRecord>`. The bound demands an index signature, so an app's `interface`
// fails it, and new code copies the bound from its neighbours. A `= LooseRecord` default is the
// fallback for an app that registered no schema and is not counted. Vue files are read through their
// `generic="..."` attribute as well as their script blocks, since most Vue bounds sit there.
//
//   pnpm check:type-escapes                compare with where HEAD left origin/main
//   pnpm check:type-escapes --base <ref>   compare with <ref> (CI passes HEAD^1)
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// The pre-push hook runs this in a bare worktree and points it at the checkout's TypeScript.
const ts = createRequire(import.meta.url)(process.env.TYPESCRIPT_PATH ?? "typescript");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const KINDS = ["double-cast", "unknown-cast", "as-never", "as-any", "cast", "non-null", "any", "unknown", "loose-bound", "ts-comment"];
// `routeTree.gen.ts` is TanStack Router's generated route tree: `@ts-nocheck`ed,
// `as any`-cast by the generator, and never hand-edited. It is gitignored, so a
// fresh checkout has none and CI never sees it — but any local dev/typecheck run
// writes one, and the ratchet must not read a generated file as the app's code.
export const SKIP = /(^|\/)(node_modules|dist|build|coverage|\.react-router|\.turbo|routeTree\.gen\.tsx?)(\/|$)/;
const JUSTIFIED = /\/\/\s*type-escape:\s*\S/;
// @ts-expect-error is how a type test proves a call fails, so it is only counted outside tests.
const TEST_FILE = /\.(test|spec)\.|\.test-d\.tsx?$|\/(__tests__|__fixtures__|e2e)\//;

const byCodeUnit = (x, y) => (x < y ? -1 : x > y ? 1 : 0);

function listFiles(tree) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (SKIP.test(path.relative(tree, full))) continue;
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|mts|vue)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) files.push(full);
    }
  };
  for (const group of ["packages", "apps"]) {
    for (const entry of readdirSync(path.join(tree, group), { withFileTypes: true })) {
      const src = path.join(tree, group, entry.name, "src");
      if (entry.isDirectory() && readdirSync(path.join(tree, group, entry.name)).includes("src")) walk(src);
    }
  }
  return files.sort(byCodeUnit);
}

/** Each block of a file the checker reads, with the line its first line sits on. */
function scripts(file, text) {
  if (!file.endsWith(".vue")) {
    return [{ text, line0: 0, kind: file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS }];
  }
  const blocks = [];
  // The opening tag may hold `>` inside a quoted attribute, as in `generic="T extends Array<U>"`.
  for (const match of text.matchAll(/(<script\b(?:[^>"']|"[^"]*"|'[^']*')*>)([\s\S]*?)<\/script>/g)) {
    const [, tag, body] = match;
    const start = match.index + tag.length;
    blocks.push({ text: body, line0: text.slice(0, start).split("\n").length - 1, kind: ts.ScriptKind.TS });
    // An SFC declares its type parameters in the tag's `generic` attribute, outside every script block.
    const generic = /\sgeneric\s*=\s*"([^"]*)"/.exec(tag);
    if (!generic) continue;
    const at = match.index + generic.index + 1;
    blocks.push({
      text: `type __generic<${generic[1]}> = never;`,
      line0: text.slice(0, at).split("\n").length - 1,
      kind: ts.ScriptKind.TS,
    });
  }
  return blocks;
}

// A return type that says nothing about what the function did with its input.
const OPAQUE_RETURN = new Set([ts.SyntaxKind.UnknownKeyword, ts.SyntaxKind.AnyKeyword, ts.SyntaxKind.VoidKeyword]);

function mentionsOpaque(node) {
  if (OPAQUE_RETURN.has(node.kind)) return true;
  let found = false;
  ts.forEachChild(node, (child) => {
    if (!found && mentionsOpaque(child)) found = true;
  });
  return found;
}

/** The type parameters a node can see, from itself outwards. */
function typeParametersInScope(node) {
  const names = new Set();
  for (let scope = node; scope; scope = scope.parent) {
    for (const parameter of scope.typeParameters ?? []) names.add(parameter.name.text);
  }
  return names;
}

function mentionsTypeParameter(node, names) {
  if (ts.isTypeReferenceNode(node) && names.has(node.typeName.getText())) return true;
  let found = false;
  ts.forEachChild(node, (child) => {
    if (!found && mentionsTypeParameter(child, names)) found = true;
  });
  return found;
}

/**
 * An `unknown` that is the right type: a type guard's input, a catch binding, a conditional
 * type's check, a type parameter's default or constraint (`<TRecord = unknown>`), or the input
 * of a function that narrows it to a concrete return (`function parse(value: unknown): string`).
 */
function isHonestUnknown(node) {
  const parent = node.parent;
  if (ts.isConditionalTypeNode(parent) && (parent.checkType === node || parent.extendsType === node)) return true;
  if (ts.isParameter(parent) && parent.type === node && parent.parent.type && ts.isTypePredicateNode(parent.parent.type)) return true;
  if (ts.isVariableDeclaration(parent) && ts.isCatchClause(parent.parent)) return true;
  // The inner half of `x as unknown as T` is counted once, as the double cast.
  if (ts.isAsExpression(parent) && ts.isAsExpression(parent.parent) && parent.parent.expression === parent) return true;
  if (ts.isTypeParameterDeclaration(parent) && (parent.default === node || parent.constraint === node)) return true;
  // A parameter typed exactly `unknown` on a function with a body and a declared return type
  // that mentions none of `unknown`, `any`, `void` or a type parameter: the signature shows the
  // input was narrowed. A type parameter can't be narrowed to, only cast to.
  // A callback type or an overload signature has no body, so its `unknown` parameter stays counted.
  const fn = parent.parent;
  if (!ts.isParameter(parent) || parent.type !== node || !fn?.body || !fn.type) return false;
  return !mentionsOpaque(fn.type) && !mentionsTypeParameter(fn.type, typeParametersInScope(fn));
}

/** A cast to a function that takes `unknown`, as in `(format as (value: unknown) => T)(raw)`. */
function castsToUnknownParameter(type) {
  return ts.isParenthesizedTypeNode(type)
    ? castsToUnknownParameter(type.type)
    : ts.isFunctionTypeNode(type) && type.parameters.some((p) => p.type?.kind === ts.SyntaxKind.UnknownKeyword);
}

/** The value a cast starts from: `x ?? {}` and `x || {}` are `{}` to the checker, but say nothing of `x`. */
function castOperand(node) {
  if (ts.isParenthesizedExpression(node)) return castOperand(node.expression);
  const isFallback =
    ts.isBinaryExpression(node) && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(node.operatorToken.kind);
  return isFallback ? castOperand(node.left) : node;
}

export const startsFromUnknown = (cast, checker) => Boolean(checker.getTypeAtLocation(castOperand(cast.expression)).flags & ts.TypeFlags.Unknown);

/** Whether a type parameter is bounded by `LooseRecord`, which asks for an index signature. */
function boundsLooseRecord(constraint) {
  if (constraint === undefined) return false;
  if (ts.isTypeReferenceNode(constraint)) return constraint.typeName.getText() === "LooseRecord";
  if (ts.isUnionTypeNode(constraint) || ts.isIntersectionTypeNode(constraint)) return constraint.types.some(boundsLooseRecord);
  return false;
}

export function classify(node) {
  if (ts.isTypeParameterDeclaration(node)) return boundsLooseRecord(node.constraint) ? "loose-bound" : null;
  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
    const type = node.type;
    if (ts.isTypeReferenceNode(type) && type.typeName.getText() === "const") return null;
    if (ts.isAsExpression(node.expression) && node.expression.type.kind === ts.SyntaxKind.UnknownKeyword) return "double-cast";
    if (type.kind === ts.SyntaxKind.UnknownKeyword && ts.isAsExpression(node.parent) && node.parent.expression === node) return null;
    if (type.kind === ts.SyntaxKind.NeverKeyword) return "as-never";
    if (type.kind === ts.SyntaxKind.AnyKeyword) return "as-any";
    return "cast";
  }
  if (ts.isNonNullExpression(node)) return "non-null";
  if (node.kind === ts.SyntaxKind.AnyKeyword && !ts.isAsExpression(node.parent)) return "any";
  if (node.kind === ts.SyntaxKind.UnknownKeyword && !isHonestUnknown(node)) {
    // `x as unknown` on its own widens and is harmless; counted only as half of a double cast.
    return ts.isAsExpression(node.parent) && node.parent.type === node ? null : "unknown";
  }
  return null;
}

/**
 * Every site in one file's text, by line. `file` is the path the report shows, and is also what
 * decides how the text is read: a `.vue` file by its blocks, a `.tsx` file as JSX.
 */
export function fileSites(file, text) {
  const sites = [];
  const lines = text.split("\n");
  const justified = (line) => JUSTIFIED.test(lines[line - 1] ?? "") || JUSTIFIED.test(lines[line - 2] ?? "");
  for (const block of scripts(file, text)) {
    const source = ts.createSourceFile(file, block.text, ts.ScriptTarget.Latest, true, block.kind);
    const visit = (node) => {
      const kind = classify(node);
      if (kind) {
        const line = block.line0 + source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        // A bound is a shape every caller answers for, not an escape a comment can excuse.
        if (kind === "loose-bound" || !justified(line)) sites.push({ line, kind });
        if (kind === "cast" && castsToUnknownParameter(node.type)) sites.push({ line, kind: "unknown-cast" });
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  lines.forEach((content, index) => {
    const comment = /\/\/\s*@ts-(ignore|nocheck|expect-error)\b/.exec(content);
    if (!comment || (comment[1] === "expect-error" && TEST_FILE.test(file))) return;
    if (!justified(index + 1)) sites.push({ line: index + 1, kind: "ts-comment" });
  });
  return sites;
}

function readEscapes(tree) {
  const sites = [];
  for (const file of listFiles(tree)) {
    const rel = path.relative(tree, file);
    for (const site of fileSites(rel, readFileSync(file, "utf8"))) sites.push({ file: rel, ...site });
  }
  return [...sites, ...readUnknownCasts(tree)];
}

/** Casts whose operand the checker reads as `unknown`, in each package's production code. */
function readUnknownCasts(tree) {
  if (!existsSync(path.join(tree, "packages/core/node_modules"))) {
    console.warn("Dependencies are not installed here, skipping casts from unknown (CI still runs it).");
    return [];
  }
  const sites = [];
  for (const entry of readdirSync(path.join(tree, "packages"), { withFileTypes: true })) {
    const config = path.join(tree, "packages", entry.name, "tsconfig.json");
    if (!entry.isDirectory() || !existsSync(config)) continue;
    const { fileNames, options } = ts.getParsedCommandLineOfConfigFile(config, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic() {} });
    const program = ts.createProgram(fileNames, options);
    const checker = program.getTypeChecker();
    for (const source of program.getSourceFiles()) {
      const rel = path.relative(tree, source.fileName);
      if (!rel.startsWith(`packages/${entry.name}/src/`) || TEST_FILE.test(rel) || source.isDeclarationFile) continue;
      const visit = (node) => {
        if (classify(node) === "cast" && startsFromUnknown(node, checker)) {
          const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
          sites.push({ file: rel, line, kind: "unknown-cast" });
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  }
  return sites;
}

function countByFile(sites) {
  const counts = new Map();
  for (const { file, kind } of sites) {
    const perKind = counts.get(file) ?? {};
    perKind[kind] = (perKind[kind] ?? 0) + 1;
    counts.set(file, perKind);
  }
  return counts;
}

const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function baseRef() {
  const flag = process.argv.indexOf("--base");
  try {
    const ref = flag === -1 ? git("merge-base", "HEAD", "origin/main") : process.argv[flag + 1];
    return git("rev-parse", "--short", "--verify", `${ref}^{commit}`);
  } catch {
    console.error("No base commit to compare with. Run git fetch origin main, or pass --base <ref>.");
    process.exit(2);
  }
}

/** Escape counts of the tree at `ref`, read from a throwaway worktree. */
function countAt(ref) {
  const dir = mkdtempSync(path.join(tmpdir(), "type-escapes-"));
  try {
    git("worktree", "add", "--detach", "--quiet", dir, ref);
    // The base's programs resolve through this checkout's dependencies.
    for (const entry of ["", ...readdirSync(path.join(root, "packages")).map((name) => `packages/${name}`)]) {
      const modules = path.join(root, entry, "node_modules");
      if (existsSync(modules) && existsSync(path.join(dir, entry))) symlinkSync(modules, path.join(dir, entry, "node_modules"));
    }
    return countByFile(readEscapes(dir));
  } finally {
    git("worktree", "remove", "--force", dir);
    rmSync(dir, { recursive: true, force: true });
  }
}

function main() {
  const sites = readEscapes(root);
  const counts = countByFile(sites);
  const base = baseRef();
  const baseline = countAt(base);
  const added = [];
  const removed = [];
  for (const [file, perKind] of counts) {
    for (const kind of KINDS) {
      const found = perKind[kind] ?? 0;
      const allowed = baseline.get(file)?.[kind] ?? 0;
      if (found > allowed) added.push({ file, kind, found, allowed });
    }
  }
  for (const [file, perKind] of baseline) {
    for (const [kind, allowed] of Object.entries(perKind)) {
      const found = counts.get(file)?.[kind] ?? 0;
      if (found < allowed) removed.push({ file, kind, found, allowed });
    }
  }

  if (added.length > 0) {
    console.error("New type escapes. Write the exact type (see .claude/skills/chelone-typescript), or justify the site with a `// type-escape: <why>` comment. A cast from `unknown` takes no comment: keep the value typed, or narrow it with a type guard. A `LooseRecord` bound takes none either: bound the type parameter on `ResourceRecord`.\n");
    for (const { file, kind, found, allowed } of added) {
      console.error(`${file}: ${found} ${kind}, ${base} has ${allowed}`);
      for (const site of sites.filter((s) => s.file === file && s.kind === kind)) console.error(`  ${site.file}:${site.line}`);
    }
  }
  if (removed.length > 0) {
    console.log(`Type escapes removed since ${base}:`);
    for (const { file, kind, found, allowed } of removed) console.log(`${file}: ${found} ${kind}, ${base} had ${allowed}`);
  }

  if (added.length > 0) process.exit(1);
  console.log(`No new type escapes: ${sites.length} in ${counts.size} files.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
