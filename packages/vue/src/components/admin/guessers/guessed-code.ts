/**
 * The text a guesser prints for a developer to copy: a Vue SFC that spells out
 * the view it just rendered. The Vue twin of `@chelone/react`'s printer, with
 * the two differences the Vue API forces: a `<DataTableCol>` / `<RecordField>`
 * wraps its field as a child, and a reference input takes no child.
 */

import type { FieldComponentName, FieldDescriptor } from "@chelone/core";

export type GuessedView = "List" | "Edit" | "Show";

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** A JS literal for a template expression; the caller escapes it for an attribute. */
function literal(value: unknown): string {
  if (typeof value === "string") {
    const escaped = value
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r");
    return `'${escaped}'`;
  }
  if (Array.isArray(value)) return `[${value.map(literal).join(", ")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value).map(
      ([key, entry]) =>
        `${IDENTIFIER.test(key) ? key : literal(key)}: ${literal(entry)}`,
    );
    return entries.length === 0 ? "{}" : `{ ${entries.join(", ")} }`;
  }
  return String(value);
}

const attrText = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

const bound = (name: string, value: unknown) =>
  `:${name}="${attrText(literal(value))}"`;

/** The `source` and, when the schema described one, the `label` of a column, record field or input. */
const sourceAttrs = (field: FieldDescriptor, withLabel = true) =>
  `source="${attrText(field.source)}"${
    withLabel && field.label !== undefined
      ? ` label="${attrText(field.label)}"`
      : ""
  }`;

/** `source`, then `label` for an input, `reference`, `choices` and, for a field, `fieldProps`. */
function attrs(
  field: FieldDescriptor,
  withFieldProps: boolean,
  withLabel = false,
): string {
  const parts = [sourceAttrs(field, withLabel)];
  if (field.reference !== undefined) {
    parts.push(`reference="${attrText(field.reference)}"`);
  }
  if (field.choices !== undefined) parts.push(bound("choices", field.choices));
  if (withFieldProps) {
    for (const [name, value] of Object.entries(field.fieldProps ?? {})) {
      parts.push(bound(name, value));
    }
  }
  return parts.join(" ");
}

const pascal = (resource: string) => {
  const name = resource
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return /^[A-Za-z]/.test(name) ? name : `Resource${name}`;
};

/**
 * A field the printer can name a component for: not `unsupported`, and it names
 * one. The guard is what lets the loops below read `field.field` with no cast.
 */
const isPrintable = (
  field: FieldDescriptor,
): field is FieldDescriptor & { field: FieldComponentName } =>
  field.kind !== "unsupported" && field.field !== undefined;

/**
 * Prints the SFC for `view` of `resource` and a `Skipped:` line for each field
 * the guessers cannot map to a component.
 */
export function printGuessedView(
  view: GuessedView,
  resource: string,
  fields: FieldDescriptor[],
): string {
  const used = new Set<string>();
  const use = (name: string) => {
    used.add(name);
    return name;
  };

  const supported = fields.filter(isPrintable);
  const lines: string[] = [];

  if (view === "List") {
    lines.push("  <List>", "    <DataTable>");
    for (const field of supported) {
      const col = use("DataTableCol");
      if (field.kind === "text") {
        lines.push(`      <${col} ${sourceAttrs(field)} />`);
      } else {
        const component = use(field.field);
        lines.push(
          `      <${col} ${sourceAttrs(field)}><${component} ${attrs(field, true)} /></${col}>`,
        );
      }
    }
    lines.push("    </DataTable>", "  </List>");
  } else if (view === "Edit") {
    lines.push("  <Edit>");
    for (const field of supported) {
      if (field.primary || field.input === undefined) continue;
      // ReferenceArrayInput declares no `label` prop.
      const label = field.input !== "ReferenceArrayInput";
      lines.push(`    <${use(field.input)} ${attrs(field, false, label)} />`);
    }
    lines.push(`    <${use("Toolbar")} />`, "  </Edit>");
  } else {
    lines.push("  <Show>");
    for (const field of supported) {
      const wrapper = use("RecordField");
      if (field.kind === "text") {
        lines.push(`    <${wrapper} ${sourceAttrs(field)} />`);
      } else {
        const component = use(field.field);
        lines.push(
          `    <${wrapper} ${sourceAttrs(field)}><${component} ${attrs(field, true)} /></${wrapper}>`,
        );
      }
    }
    lines.push("  </Show>");
  }
  use(view);
  if (view === "List") use("DataTable");

  const skipped = fields
    .filter((field) => !isPrintable(field))
    .map(
      (field) => `Skipped: ${field.source} (${field.reason ?? "no component"})`,
    );

  return [
    `Guessed ${view} for "${resource}":`,
    "",
    '<script setup lang="ts">',
    `import { ${[...used].sort().join(", ")} } from "@chelone/vue";`,
    "",
    `defineOptions({ name: "${pascal(resource)}${view}" });`,
    "</script>",
    "",
    "<template>",
    ...lines,
    "</template>",
    ...(skipped.length > 0 ? ["", ...skipped] : []),
  ].join("\n");
}
