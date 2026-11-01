/**
 * The text a guesser prints for a developer to copy: a Vue SFC that spells out
 * the view it just rendered. The Vue twin of `@chelone/react`'s printer, with
 * the two differences the Vue API forces: a `<DataTableCol>` / `<RecordField>`
 * wraps its field as a child, and a reference input takes no child.
 */

import type { FieldDescriptor } from "@chelone/core";

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

/** `source`, then `reference`, `choices` and, for a field, `fieldProps`. */
function attrs(field: FieldDescriptor, withFieldProps: boolean): string {
  const parts = [`source="${attrText(field.source)}"`];
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

const isSkipped = (field: FieldDescriptor) =>
  field.kind === "unsupported" || field.field === undefined;

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

  const supported = fields.filter((field) => !isSkipped(field));
  const lines: string[] = [];

  if (view === "List") {
    lines.push("  <List>", "    <DataTable>");
    for (const field of supported) {
      const col = use("DataTableCol");
      if (field.kind === "text") {
        lines.push(`      <${col} source="${attrText(field.source)}" />`);
      } else {
        const component = use(field.field as string);
        lines.push(
          `      <${col} source="${attrText(field.source)}"><${component} ${attrs(field, true)} /></${col}>`,
        );
      }
    }
    lines.push("    </DataTable>", "  </List>");
  } else if (view === "Edit") {
    lines.push("  <Edit>");
    for (const field of supported) {
      if (field.primary || field.input === undefined) continue;
      lines.push(`    <${use(field.input)} ${attrs(field, false)} />`);
    }
    lines.push(`    <${use("Toolbar")} />`, "  </Edit>");
  } else {
    lines.push("  <Show>");
    for (const field of supported) {
      const wrapper = use("RecordField");
      if (field.kind === "text") {
        lines.push(`    <${wrapper} source="${attrText(field.source)}" />`);
      } else {
        const component = use(field.field as string);
        lines.push(
          `    <${wrapper} source="${attrText(field.source)}"><${component} ${attrs(field, true)} /></${wrapper}>`,
        );
      }
    }
    lines.push("  </Show>");
  }
  use(view);
  if (view === "List") use("DataTable");

  const skipped = fields
    .filter(isSkipped)
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
