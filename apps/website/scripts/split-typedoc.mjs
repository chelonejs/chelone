#!/usr/bin/env node
/**
 * Reads the monolithic `public-api.typedoc.json` produced by `typedoc` and
 * splits it into one JSON file per component with documented props, written to
 * `src/docs/content/props/<ComponentName>.json`: a `NameProps` interface or
 * type alias, or a component whose signature takes one.
 *
 * The `<PropsTable>` component reads these per-component files at build
 * time to render prop tables. Splitting up-front keeps each MDX page reading
 * only the slice it needs.
 *
 * Run via `pnpm run props:generate` from the www-v2 workspace (chained after
 * typedoc).
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const propsDir = resolve(__dirname, "../src/docs/content/props");
mkdirSync(propsDir, { recursive: true });

const docPath = resolve(__dirname, "./public-api.typedoc.json");
const doc = JSON.parse(readFileSync(docPath, "utf-8"));

/**
 * Render a typedoc `type` node to a short human-readable string. Covers the
 * common shapes we encounter in this codebase (intrinsic primitives, named
 * references with type arguments, unions/intersections, arrays, tuples,
 * literal types, reflection callbacks). Falls back to the discriminator
 * `type` field when a shape is not handled — keeps the table populated even
 * when typedoc emits a nested object we don't render perfectly.
 *
 * @param {any} t
 * @returns {string}
 */
function renderType(t) {
  if (!t) return "unknown";
  switch (t.type) {
    case "intrinsic":
      return t.name;
    case "reference": {
      const args = t.typeArguments?.length
        ? `<${t.typeArguments.map(renderType).join(", ")}>`
        : "";
      return `${t.name}${args}`;
    }
    case "union":
      return t.types.map(renderType).join(" | ");
    case "intersection":
      return t.types.map(renderType).join(" & ");
    case "array":
      return `${renderType(t.elementType)}[]`;
    case "tuple":
      return `[${(t.elements ?? []).map(renderType).join(", ")}]`;
    case "literal":
      if (t.value === null) return "null";
      if (typeof t.value === "string") return JSON.stringify(t.value);
      return String(t.value);
    case "reflection":
      // Most common shape: a callback signature.
      if (t.declaration?.signatures?.[0]) {
        const sig = t.declaration.signatures[0];
        const params = (sig.parameters ?? [])
          .map(
            /** @param {any} p */ (p) =>
              `${p.name}: ${renderType(p.type)}`,
          )
          .join(", ");
        const ret = renderType(sig.type);
        return `(${params}) => ${ret}`;
      }
      // Object shape with named children.
      if (t.declaration?.children?.length) {
        const fields = t.declaration.children
          .map(
            /** @param {any} c */ (c) =>
              `${c.name}${c.flags?.isOptional ? "?" : ""}: ${renderType(c.type)}`,
          )
          .join("; ");
        return `{ ${fields} }`;
      }
      return "object";
    case "predicate":
      return `${t.name} is ${renderType(t.targetType)}`;
    case "query":
      return `typeof ${renderType(t.queryType)}`;
    case "typeOperator":
      return `${t.operator} ${renderType(t.target)}`;
    case "indexedAccess":
      return `${renderType(t.objectType)}[${renderType(t.indexType)}]`;
    case "conditional":
      return `${renderType(t.checkType)} extends ${renderType(t.extendsType)} ? ${renderType(t.trueType)} : ${renderType(t.falseType)}`;
    case "mapped":
      return `{ [${t.parameter} in ${renderType(t.parameterType)}]: ${renderType(t.templateType)} }`;
    case "namedTupleMember":
      return `${t.name}${t.isOptional ? "?" : ""}: ${renderType(t.element)}`;
    case "rest":
      return `...${renderType(t.elementType)}`;
    case "optional":
      return `${renderType(t.elementType)}?`;
    default:
      return t.name ?? t.type ?? "unknown";
  }
}

/**
 * Flatten a typedoc comment summary (array of segment objects) to plain text.
 * Drops formatting hints — we render in a tight table cell.
 *
 * @param {any} comment
 * @returns {string}
 */
function renderComment(comment) {
  if (!comment?.summary) return "";
  return comment.summary
    .map(/** @param {any} s */ (s) => s.text ?? "")
    .join("")
    .trim();
}

/**
 * Documented `*Props` declarations, by declaration name. Kind 256 = Interface,
 * kind 2097152 = TypeAlias.
 * @type {Map<string, any>}
 */
const propsDecls = new Map();

/**
 * Component declarations, which carry their props in their signature rather
 * than in a `NameProps` declaration of their own. Kind 32 = Variable, for a
 * const holding a component (`PointField = GeoJsonField`); kind 64 = Function.
 * @type {any[]}
 */
const components = [];

/**
 * Fill `propsDecls` and `components` from a typedoc node and its children.
 * Component names start upper case, which leaves out the hooks and plain
 * functions (`useMap`, `simplifyGeo`) that share the entry files.
 *
 * @param {any} node
 */
function collect(node) {
  if (typeof node.name === "string") {
    if (node.kind === 256 || node.kind === 2097152) {
      if (/Props$/.test(node.name)) {
        if (propsDecls.has(node.name)) {
          // First-seen-wins. If two source modules export the same `*Props`
          // name, warn loudly rather than silently attaching the wrong table to
          // a component.
          console.warn(
            `warning: duplicate props interface "${node.name}" — keeping the first; the later one is ignored. Disambiguate the source export names.`,
          );
        } else {
          propsDecls.set(node.name, node);
        }
      }
    } else if (
      (node.kind === 32 || node.kind === 64) &&
      /^[A-Z]/.test(node.name)
    ) {
      components.push(node);
    }
  }
  for (const child of node.children ?? []) {
    collect(child);
  }
}

/**
 * Utility types that wrap another props type instead of naming one, and what
 * each does with the keys its second type argument names: `Omit` drops them,
 * `Pick` keeps only them, and the rest restate every member of the type they
 * wrap.
 */
const WRAPPED_PROPS = new Map([
  ["Omit", "drop"],
  ["Pick", "keep"],
  ["Partial", "all"],
  ["Required", "all"],
  ["Readonly", "all"],
]);

/**
 * One props shape built from several. A member named twice keeps the position
 * of its first appearance and the type of the branch that names it last, which
 * is the branch the source writes to override it, and a comment from whichever
 * branch carries one. Without this an intersection such as `Partial<InputProps>
 * & { onChange?: (value: string) => void }` lists `onChange` twice with two
 * different types.
 *
 * @param {any[][]} groups
 * @returns {any[]}
 */
function mergeMembers(groups) {
  const merged = new Map();
  for (const group of groups) {
    for (const member of group) {
      const earlier = merged.get(member.name);
      // An override that says nothing keeps what the branch it overrides said.
      merged.set(
        member.name,
        earlier && !member.comment && earlier.comment
          ? { ...member, comment: earlier.comment }
          : member,
      );
    }
  }
  return [...merged.values()];
}

/**
 * The string literals a type node holds: one literal, or a union of them.
 *
 * @param {any} type
 * @returns {Set<string>}
 */
function literalNames(type) {
  const names = new Set();
  if (!type) return names;
  const parts = type.type === "union" ? type.types : [type];
  for (const part of parts) {
    if (part?.type === "literal" && typeof part.value === "string") {
      names.add(part.value);
    }
  }
  return names;
}

/**
 * The props members of a `*Props` declaration: an interface's `children`, or a
 * type alias read through its own type.
 *
 * @param {any} decl
 * @param {Set<string>} seen declarations already on this resolution path, so a
 *   cyclic alias cannot spin.
 * @returns {any[]}
 */
function membersOf(decl, seen) {
  if (!decl) return [];
  if (decl.children?.length) return decl.children;
  if (decl.name) seen.add(decl.name);
  return membersOfType(decl.type, seen);
}

/**
 * The props members a type node carries: an inline object, a reference to a
 * documented `*Props` declaration, an intersection of those, or a utility type
 * over one. `GeoJsonInputBaseProps` is `Omit<ShapeInputProps, "kind">` and
 * `AutocompleteInputProps` holds `Partial<Pick<InputProps, "source">>`, so
 * neither names its members directly. A reference typedoc never documented,
 * because no entry point re-exports it (`LineStringInputProps`), carries
 * nothing.
 *
 * @param {any} type
 * @param {Set<string>} seen
 * @returns {any[]}
 */
function membersOfType(type, seen) {
  if (!type) return [];
  switch (type.type) {
    case "reflection":
      return type.declaration?.children ?? [];
    case "intersection":
      return mergeMembers(
        type.types.map(/** @param {any} t */ (t) => membersOfType(t, seen)),
      );
    case "reference": {
      const decl = propsDecls.get(type.name);
      if (decl) return seen.has(type.name) ? [] : membersOf(decl, seen);
      const keeps = WRAPPED_PROPS.get(type.name);
      if (!keeps || !type.typeArguments?.length) return [];
      const [wrapped, keys] = type.typeArguments;
      const named = literalNames(keys);
      const members = membersOfType(wrapped, seen);
      // Keys typed as something other than string literals (`keyof U`) are
      // unreadable here: `Pick` then proves nothing about the shape and yields
      // nothing, and `Omit` drops nothing.
      if (keeps === "keep") return members.filter((m) => named.has(m.name));
      if (keeps === "drop")
        return members.filter((m) => !named.has(m.name));
      return members;
    }
    default:
      return [];
  }
}

/**
 * The props a component declaration takes: the first parameter of its
 * signature. A function component states its signature directly; a const
 * holding one carries it inside its own type.
 *
 * @param {any} component
 * @returns {any[]}
 */
function membersOfComponent(component) {
  const signature =
    component.kind === 64
      ? component.signatures?.[0]
      : component.type?.type === "reflection"
        ? component.type.declaration?.signatures?.[0]
        : undefined;
  const param = signature?.parameters?.[0];
  return param?.type ? membersOfType(param.type, new Set()) : [];
}

/**
 * @param {string} name
 * @param {any[]} members
 * @returns {string} the props page JSON
 */
function propsPage(name, members) {
  const props = members.map(
    /** @param {any} c */ (c) => ({
      name: c.name,
      type: renderType(c.type),
      optional: c.flags?.isOptional === true,
      comment: renderComment(c.comment),
    }),
  );
  return JSON.stringify({ name, props }, null, 2) + "\n";
}

collect(doc);

const pages = new Map();

for (const [declName, decl] of propsDecls) {
  const componentName = declName.replace(/Props$/, "");
  pages.set(componentName, propsPage(componentName, membersOf(decl, new Set())));
}

// Components typed by another component's props: `PointField` and its GeoJSON
// siblings are all `GeoJsonField`, and the shape inputs take
// `GeoJsonInputBaseProps`. Their tables read the props the component reads.
for (const component of components) {
  if (pages.has(component.name)) continue;
  const members = membersOfComponent(component);
  if (members.length === 0) continue;
  pages.set(component.name, propsPage(component.name, members));
}

// Remove obsolete names before writing: case-insensitive filesystems keep the
// old filename when a component changes only case.
for (const entry of readdirSync(propsDir, { withFileTypes: true })) {
  if (
    entry.isFile() &&
    entry.name.endsWith(".json") &&
    !pages.has(entry.name.slice(0, -5))
  ) {
    unlinkSync(resolve(propsDir, entry.name));
  }
}

for (const [componentName, content] of pages) {
  writeFileSync(resolve(propsDir, `${componentName}.json`), content);
}

console.log(`Wrote ${pages.size} prop files to ${propsDir}`);
