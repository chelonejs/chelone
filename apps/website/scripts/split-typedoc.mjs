#!/usr/bin/env node
/**
 * Reads the monolithic `public-api.typedoc.json` produced by `typedoc` and
 * splits it into one JSON file per component-props interface, written to
 * `src/docs/content/props/<ComponentName>.json`.
 *
 * The `<PropsTable>` component reads these per-component files at build
 * time to render prop tables. Splitting up-front keeps each MDX page reading
 * only the slice it needs.
 *
 * Run via `pnpm run props:generate` from the www-v2 workspace (chained after
 * typedoc).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
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
 * Yield every typedoc node that looks like a `<Component>Props` interface or
 * type alias declaration. Kind 256 = Interface, kind 2097152 = TypeAlias.
 *
 * @param {any} node
 * @returns {Generator<{componentName: string, iface: any}>}
 */
function* walk(node) {
  if (
    (node.kind === 256 || node.kind === 2097152) &&
    typeof node.name === "string" &&
    /Props$/.test(node.name)
  ) {
    yield {
      componentName: node.name.replace(/Props$/, ""),
      iface: node,
    };
  }
  for (const child of node.children ?? []) {
    yield* walk(child);
  }
}

let written = 0;
const seen = new Set();

for (const { componentName, iface } of walk(doc)) {
  if (seen.has(componentName)) {
    // First-seen-wins. If two source modules export the same `*Props` name,
    // warn loudly rather than silently attaching the wrong table to a component.
    console.warn(
      `warning: duplicate props interface "${componentName}Props" — keeping the first; the later one is ignored. Disambiguate the source export names.`,
    );
    continue;
  }
  seen.add(componentName);

  // Interfaces have `children`; type aliases sometimes resolve to an inline
  // reflection (intersection / object literal). Try both shapes.
  let members = iface.children;
  if (!members && iface.type?.type === "reflection") {
    members = iface.type.declaration?.children ?? [];
  }

  const props = (members ?? []).map(
    /** @param {any} c */ (c) => ({
      name: c.name,
      type: renderType(c.type),
      optional: c.flags?.isOptional === true,
      comment: renderComment(c.comment),
    }),
  );

  writeFileSync(
    resolve(propsDir, `${componentName}.json`),
    JSON.stringify({ name: componentName, props }, null, 2) + "\n",
  );
  written++;
}

console.log(`Wrote ${written} prop files to ${propsDir}`);
