#!/usr/bin/env node
/**
 * Writes one JSON file per Vue component to `src/docs/content/props/vue/`: the
 * props, emitted events and slots `@chelone/vue` declares, read from the
 * component source with `vue-component-meta`. `<PropsTable>` shows that file
 * when a docs page is set to Vue, and `content/props/<Name>.json` (from
 * `split-typedoc.mjs`) when it is set to React.
 *
 * A component is whatever an entry file in the package's `exports` exposes as
 * `export { default as Name } from "./name.vue"`, followed through the barrels
 * that re-export it.
 *
 * Run via `pnpm --dir apps/website props`.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { createChecker } from "vue-component-meta";

import { isMain } from "./copy-demo.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const vuePackage = resolve(here, "../../../packages/vue");
const propsDir = resolve(here, "../src/docs/content/props/vue");

/** @param {string} tsconfigPath */
export function createVueChecker(tsconfigPath) {
  return createChecker(tsconfigPath, { forceUseTs: true, rawType: true });
}

/**
 * A dependency bundled into one declaration file exports its classes under
 * mangled names (`export { QueryClient$1 as t }`), and TypeScript prints the
 * type with the name it can reach it by. This collects, for the named types a
 * type holds, each name their declaration file exports them as against the name
 * the dependency declares, so the page can say `QueryClient` where the checker
 * says `t`. It reads through
 * unions, type arguments, and anonymous object types, since a named type prints
 * as its name and none of its members show.
 *
 * @param {ts.TypeChecker} typeChecker
 * @param {ts.Type | undefined} type
 * @param {Map<string, string>} renames exported name -> declared name
 * @param {Set<ts.Type>} seen
 * @param {number} depth
 */
function collectRenames(typeChecker, type, renames, seen = new Set(), depth = 0) {
  if (!type || seen.has(type) || depth > 5) return;
  seen.add(type);
  const symbol = type.aliasSymbol ?? type.symbol;
  // A method or type literal has a symbol too, but prints as its shape.
  const declaration = symbol?.declarations?.find(
    (d) =>
      d.getSourceFile().isDeclarationFile &&
      (ts.isClassDeclaration(d) ||
        ts.isInterfaceDeclaration(d) ||
        ts.isTypeAliasDeclaration(d) ||
        ts.isEnumDeclaration(d)),
  );
  const anonymous = !declaration;
  if (declaration && symbol) {
    const declared = symbol.name.replace(/\$\d+$/, "");
    const moduleSymbol = typeChecker.getSymbolAtLocation(declaration.getSourceFile());
    for (const exported of moduleSymbol ? typeChecker.getExportsOfModule(moduleSymbol) : []) {
      const target =
        exported.flags & ts.SymbolFlags.Alias ? typeChecker.getAliasedSymbol(exported) : exported;
      if (target === symbol && exported.name !== declared) renames.set(exported.name, declared);
    }
  }
  for (const member of type.isUnionOrIntersection() ? type.types : []) {
    collectRenames(typeChecker, member, renames, seen, depth + 1);
  }
  for (const arg of type.aliasTypeArguments ?? []) {
    collectRenames(typeChecker, arg, renames, seen, depth + 1);
  }
  if (!(type.flags & ts.TypeFlags.Object)) return;
  const objectType = /** @type {ts.ObjectType} */ (type);
  if (objectType.objectFlags & ts.ObjectFlags.Reference) {
    for (const arg of typeChecker.getTypeArguments(/** @type {ts.TypeReference} */ (type))) {
      collectRenames(typeChecker, arg, renames, seen, depth + 1);
    }
  }
  if (!anonymous) return;
  for (const property of typeChecker.getPropertiesOfType(type)) {
    collectRenames(typeChecker, typeChecker.getTypeOfSymbol(property), renames, seen, depth + 1);
  }
  for (const signature of type.getCallSignatures()) {
    for (const parameter of signature.getParameters()) {
      collectRenames(typeChecker, typeChecker.getTypeOfSymbol(parameter), renames, seen, depth + 1);
    }
    collectRenames(typeChecker, signature.getReturnType(), renames, seen, depth + 1);
  }
}

/**
 * A checker-printed type with each mangled dependency name put back. A name
 * that is a property or parameter label (`e?:`) or a member access is left.
 *
 * @param {ReturnType<typeof createVueChecker>} checker
 * @param {string} printed
 * @param {ts.Type | undefined} type
 */
function declaredTypeNames(checker, printed, type) {
  /** @type {Map<string, string>} */
  const renames = new Map();
  collectRenames(checker.getProgram().getTypeChecker(), type, renames);
  let result = printed;
  for (const [mangled, declared] of renames) {
    const escaped = mangled.replace(/\$/g, "\\$");
    result = result.replace(
      new RegExp(`(?<![\\w$.])${escaped}(?![\\w$]|\\s*\\??:)`, "g"),
      declared,
    );
  }
  return result;
}

/**
 * @typedef {{ name: string; type: string; optional: boolean; default?: string; comment: string }} VueProp
 * @typedef {{ name: string; type: string }} VueEmit
 * @typedef {{ name: string; type: string; comment: string }} VueSlot
 */

/**
 * The checker spells an optional prop's type with a trailing `| undefined`,
 * which the Optional column already says.
 *
 * @param {string} type
 */
const withoutUndefined = (type) => type.replace(/ \| undefined$/, "");

/**
 * The page for one component: its props, emits and slots. Props every element
 * takes (`class`, `key`, `ref`) are left out.
 *
 * @param {ReturnType<typeof createVueChecker>} checker
 * @param {string} name
 * @param {string} file the component's `.vue` file, or the `.ts` file that
 *   declares it as a const
 * @param {string} [exportName] `default` for a `.vue` file, the const's name
 *   otherwise
 * @returns {{ name: string; props: VueProp[]; emits: VueEmit[]; slots: VueSlot[] }}
 */
export function vuePropsPage(checker, name, file, exportName = "default") {
  const meta = checker.getComponentMeta(file, exportName);
  return {
    name,
    props: meta.props
      .filter((prop) => !prop.global)
      .map((prop) => ({
        name: prop.name,
        type: declaredTypeNames(
          checker,
          prop.required ? prop.type : withoutUndefined(prop.type),
          prop.rawType,
        ),
        optional: !prop.required,
        ...(prop.default === undefined ? {} : { default: prop.default }),
        comment: prop.description,
      })),
    emits: meta.events.map((event) => ({
      name: event.name,
      type: declaredTypeNames(checker, event.type, event.rawType),
    })),
    slots: meta.slots.map((slot) => ({
      name: slot.name,
      // A slot that receives nothing has no props type to read.
      type: slot.type === "any" ? "{}" : declaredTypeNames(checker, slot.type, slot.rawType),
      comment: slot.description,
    })),
  };
}

/** @param {string} from @param {string} specifier */
function resolveModule(from, specifier) {
  const base = resolve(dirname(from), specifier);
  return [base, `${base}.ts`, resolve(base, "index.ts")].find(
    (candidate) => candidate.endsWith(".vue") || candidate.endsWith(".ts")
      ? existsSync(candidate)
      : false,
  );
}

/**
 * @typedef {{ file: string; exportName: string }} ComponentSource where a
 *   component is declared and what the file exports it as
 */

/**
 * The component candidates a `.ts` entry file exports, by public name. A
 * `export { default as Name } from "./x.vue"` names one, and so does an
 * upper-case `export const Name = ...` (`PointField = GeoJsonField`). `export *`
 * and `export { A as B } from "./barrel"` carry them through a barrel.
 * Type-only exports and anything else are skipped. A const that is no
 * component, such as a constant array, is a candidate too: `vuePropsPages`
 * drops what the checker does not read as a component.
 *
 * @param {string} file
 * @param {Set<string>} [seen] barrels already read, so a cycle cannot spin
 * @returns {Map<string, ComponentSource>}
 */
export function exportedComponents(file, seen = new Set()) {
  /** @type {Map<string, ComponentSource>} */
  const found = new Map();
  if (seen.has(file)) return found;
  seen.add(file);
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest);
  for (const statement of source.statements) {
    if (
      ts.isVariableStatement(statement) &&
      statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      for (const { name } of statement.declarationList.declarations) {
        if (ts.isIdentifier(name) && /^[A-Z]/.test(name.text)) {
          found.set(name.text, { file, exportName: name.text });
        }
      }
      continue;
    }
    if (!ts.isExportDeclaration(statement) || statement.isTypeOnly) continue;
    const specifier = statement.moduleSpecifier;
    if (!specifier || !ts.isStringLiteral(specifier) || !specifier.text.startsWith(".")) continue;
    const target = resolveModule(file, specifier.text);
    if (!target) continue;
    const clause = statement.exportClause;
    if (!clause) {
      if (target.endsWith(".ts")) {
        for (const [name, from] of exportedComponents(target, seen)) found.set(name, from);
      }
    } else if (ts.isNamedExports(clause)) {
      const inner = target.endsWith(".ts") ? exportedComponents(target, seen) : undefined;
      for (const element of clause.elements) {
        if (element.isTypeOnly) continue;
        const exported = element.name.text;
        const original = (element.propertyName ?? element.name).text;
        if (target.endsWith(".vue")) {
          if (original === "default") found.set(exported, { file: target, exportName: "default" });
        } else {
          const from = inner?.get(original);
          if (from) found.set(exported, from);
        }
      }
    }
  }
  return found;
}

/** The `.ts` entry files the package's `exports` map points at. */
function entryFiles() {
  const { exports } = JSON.parse(readFileSync(resolve(vuePackage, "package.json"), "utf8"));
  return Object.values(exports)
    .filter((target) => typeof target === "string" && target.endsWith(".ts"))
    .map((target) => resolve(vuePackage, target));
}

/**
 * The page for each candidate the checker reads as a component, by name.
 *
 * @param {ReturnType<typeof createVueChecker>} checker
 * @param {Map<string, ComponentSource>} candidates
 */
export function vuePropsPages(checker, candidates) {
  const pages = new Map();
  for (const [name, { file, exportName }] of [...candidates].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    try {
      if (checker.getComponentMeta(file, exportName).type === 0) continue;
    } catch {
      // The export is not something the checker can read props from.
      continue;
    }
    pages.set(name, vuePropsPage(checker, name, file, exportName));
  }
  return pages;
}

export function main() {
  const checker = createVueChecker(resolve(vuePackage, "tsconfig.json"));
  /** @type {Map<string, ComponentSource>} */
  const candidates = new Map();
  for (const entry of entryFiles()) {
    for (const [name, from] of exportedComponents(entry)) candidates.set(name, from);
  }
  const pages = vuePropsPages(checker, candidates);

  mkdirSync(propsDir, { recursive: true });
  for (const entry of readdirSync(propsDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".json") && !pages.has(entry.name.slice(0, -5))) {
      unlinkSync(resolve(propsDir, entry.name));
    }
  }
  for (const [name, page] of pages) {
    writeFileSync(resolve(propsDir, `${name}.json`), `${JSON.stringify(page, null, 2)}\n`);
  }
  console.log(`Wrote ${pages.size} Vue prop files to ${propsDir}`);
}

if (isMain(import.meta.url, process.argv[1])) main();
