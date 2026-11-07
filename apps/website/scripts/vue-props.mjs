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
  return createChecker(tsconfigPath, { forceUseTs: true });
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
 * @param {string} file the component's `.vue` file
 * @returns {{ name: string; props: VueProp[]; emits: VueEmit[]; slots: VueSlot[] }}
 */
export function vuePropsPage(checker, name, file) {
  const meta = checker.getComponentMeta(file);
  return {
    name,
    props: meta.props
      .filter((prop) => !prop.global)
      .map((prop) => ({
        name: prop.name,
        type: prop.required ? prop.type : withoutUndefined(prop.type),
        optional: !prop.required,
        ...(prop.default === undefined ? {} : { default: prop.default }),
        comment: prop.description,
      })),
    emits: meta.events.map((event) => ({ name: event.name, type: event.type })),
    slots: meta.slots.map((slot) => ({
      name: slot.name,
      // A slot that receives nothing has no props type to read.
      type: slot.type === "any" ? "{}" : slot.type,
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
 * The components a `.ts` entry file exports, by public name, with the `.vue`
 * file each is. Only `export { default as Name } from "./x.vue"` names one, and
 * `export *` and `export { A as B } from "./barrel"` carry them through a
 * barrel. Type-only exports and anything else are skipped.
 *
 * @param {string} file
 * @param {Set<string>} [seen] barrels already read, so a cycle cannot spin
 * @returns {Map<string, string>}
 */
export function exportedComponents(file, seen = new Set()) {
  /** @type {Map<string, string>} */
  const found = new Map();
  if (seen.has(file)) return found;
  seen.add(file);
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest);
  for (const statement of source.statements) {
    if (!ts.isExportDeclaration(statement) || statement.isTypeOnly) continue;
    const specifier = statement.moduleSpecifier;
    if (!specifier || !ts.isStringLiteral(specifier) || !specifier.text.startsWith(".")) continue;
    const target = resolveModule(file, specifier.text);
    if (!target) continue;
    const clause = statement.exportClause;
    if (!clause) {
      if (target.endsWith(".ts")) {
        for (const [name, vue] of exportedComponents(target, seen)) found.set(name, vue);
      }
    } else if (ts.isNamedExports(clause)) {
      const inner = target.endsWith(".ts") ? exportedComponents(target, seen) : undefined;
      for (const element of clause.elements) {
        if (element.isTypeOnly) continue;
        const exported = element.name.text;
        const original = (element.propertyName ?? element.name).text;
        if (target.endsWith(".vue")) {
          if (original === "default") found.set(exported, target);
        } else {
          const vue = inner?.get(original);
          if (vue) found.set(exported, vue);
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

export function main() {
  const checker = createVueChecker(resolve(vuePackage, "tsconfig.json"));
  /** @type {Map<string, string>} */
  const components = new Map();
  for (const entry of entryFiles()) {
    for (const [name, file] of exportedComponents(entry)) components.set(name, file);
  }
  const pages = new Map();
  for (const [name, file] of [...components].sort(([a], [b]) => a.localeCompare(b))) {
    pages.set(name, vuePropsPage(checker, name, file));
  }

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
