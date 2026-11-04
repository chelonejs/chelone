// Fails when a pull request adds a type escape, or removes one without
// updating the baseline. Escapes are counted per file and kind, parsed with
// TypeScript (Vue files by their <script> blocks), so the count does not move
// when unrelated lines do.
//
// A site is not counted when its line, or the line above, carries a
// `// type-escape: <why>` comment. That is the way to add a justified escape.
//
//   pnpm check:type-escapes            compare with type-escapes-baseline.json
//   pnpm check:type-escapes --update   rewrite the baseline from the current tree
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The pre-push hook runs this in a bare worktree and points it at the checkout's TypeScript.
const ts = createRequire(import.meta.url)(process.env.TYPESCRIPT_PATH ?? "typescript");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = path.join(root, "type-escapes-baseline.json");

const KINDS = ["double-cast", "as-never", "as-any", "cast", "non-null", "any", "unknown", "ts-comment"];
const SKIP = /(^|\/)(node_modules|dist|build|coverage|\.react-router|\.turbo)(\/|$)/;
const JUSTIFIED = /\/\/\s*type-escape:\s*\S/;
// @ts-expect-error is how a type test proves a call fails, so it is only counted outside tests.
const TEST_FILE = /\.(test|spec)\.|\.test-d\.ts$|\/(__tests__|__fixtures__|e2e)\//;

const byCodeUnit = (x, y) => (x < y ? -1 : x > y ? 1 : 0);

function listFiles() {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (SKIP.test(path.relative(root, full))) continue;
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|mts|vue)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) files.push(full);
    }
  };
  for (const group of ["packages", "apps"]) {
    for (const entry of readdirSync(path.join(root, group), { withFileTypes: true })) {
      const src = path.join(root, group, entry.name, "src");
      if (entry.isDirectory() && readdirSync(path.join(root, group, entry.name)).includes("src")) walk(src);
    }
  }
  return files.sort(byCodeUnit);
}

/** Each script block of a file, with the line it starts on. */
function scripts(file, text) {
  if (!file.endsWith(".vue")) {
    return [{ text, line0: 0, kind: file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS }];
  }
  const blocks = [];
  for (const match of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    const start = match.index + match[0].indexOf(">") + 1;
    blocks.push({ text: match[1], line0: text.slice(0, start).split("\n").length - 1, kind: ts.ScriptKind.TS });
  }
  return blocks;
}

/** An `unknown` that is the right type: a type guard's input, a catch binding, a conditional type's check. */
function isHonestUnknown(node) {
  const parent = node.parent;
  if (ts.isConditionalTypeNode(parent) && (parent.checkType === node || parent.extendsType === node)) return true;
  if (ts.isParameter(parent) && parent.type === node && parent.parent.type && ts.isTypePredicateNode(parent.parent.type)) return true;
  if (ts.isVariableDeclaration(parent) && ts.isCatchClause(parent.parent)) return true;
  // The inner half of `x as unknown as T` is counted once, as the double cast.
  if (ts.isAsExpression(parent) && ts.isAsExpression(parent.parent) && parent.parent.expression === parent) return true;
  return false;
}

function classify(node) {
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

function readEscapes() {
  const sites = [];
  for (const file of listFiles()) {
    const rel = path.relative(root, file);
    const text = readFileSync(file, "utf8");
    const lines = text.split("\n");
    const justified = (line) => JUSTIFIED.test(lines[line - 1] ?? "") || JUSTIFIED.test(lines[line - 2] ?? "");
    for (const block of scripts(file, text)) {
      const source = ts.createSourceFile(file, block.text, ts.ScriptTarget.Latest, true, block.kind);
      const visit = (node) => {
        const kind = classify(node);
        if (kind) {
          const line = block.line0 + source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
          if (!justified(line)) sites.push({ file: rel, line, kind });
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    lines.forEach((content, index) => {
      const comment = /\/\/\s*@ts-(ignore|nocheck|expect-error)\b/.exec(content);
      if (!comment || (comment[1] === "expect-error" && TEST_FILE.test(rel))) return;
      if (!justified(index + 1)) sites.push({ file: rel, line: index + 1, kind: "ts-comment" });
    });
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

function readBaseline() {
  try {
    return JSON.parse(readFileSync(baselinePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

function writeBaseline(counts) {
  const sorted = Object.fromEntries(
    [...counts]
      .sort(([x], [y]) => byCodeUnit(x, y))
      .map(([file, perKind]) => [file, Object.fromEntries(KINDS.filter((k) => perKind[k]).map((k) => [k, perKind[k]]))]),
  );
  writeFileSync(baselinePath, `${JSON.stringify(sorted, null, 2)}\n`);
}

const sites = readEscapes();
const counts = countByFile(sites);

if (process.argv.includes("--update")) {
  writeBaseline(counts);
  console.log(`type-escapes-baseline.json rewritten: ${sites.length} escapes in ${counts.size} files.`);
  process.exit(0);
}

const baseline = readBaseline();
const added = [];
const removed = [];
for (const [file, perKind] of counts) {
  for (const kind of KINDS) {
    const found = perKind[kind] ?? 0;
    const allowed = baseline[file]?.[kind] ?? 0;
    if (found > allowed) added.push({ file, kind, found, allowed });
  }
}
for (const [file, perKind] of Object.entries(baseline)) {
  for (const [kind, allowed] of Object.entries(perKind)) {
    const found = counts.get(file)?.[kind] ?? 0;
    if (found < allowed) removed.push({ file, kind, found, allowed });
  }
}

if (added.length > 0) {
  console.error("New type escapes. Write the exact type (see .claude/skills/chelone-typescript), or justify the site with a `// type-escape: <why>` comment:\n");
  for (const { file, kind, found, allowed } of added) {
    console.error(`${file}: ${found} ${kind}, baseline allows ${allowed}`);
    for (const site of sites.filter((s) => s.file === file && s.kind === kind)) console.error(`  ${site.file}:${site.line}`);
  }
}
if (removed.length > 0) {
  if (added.length > 0) console.error("");
  console.error("Type escapes were removed. Run pnpm check:type-escapes --update and commit the baseline:\n");
  for (const { file, kind, found, allowed } of removed) console.error(`${file}: ${found} ${kind}, baseline has ${allowed}`);
}

if (added.length > 0 || removed.length > 0) process.exit(1);
console.log(`No new type escapes: ${sites.length} in ${counts.size} files match the baseline.`);
