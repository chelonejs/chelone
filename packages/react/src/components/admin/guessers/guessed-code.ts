import type { FieldDescriptor } from "@chelone/core";

type GuessedView = "List" | "Edit" | "Show";

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** A JS expression for a plain value, as a developer would type it. */
function literal(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(literal).join(", ")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value).map(
      ([key, entry]) =>
        `${IDENTIFIER.test(key) ? key : JSON.stringify(key)}: ${literal(entry)}`,
    );
    return entries.length === 0 ? "{}" : `{ ${entries.join(", ")} }`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function attribute(name: string, value: unknown): string {
  if (value === true) return name;
  if (typeof value === "string" && !/["\\\n]/.test(value)) {
    return `${name}="${value}"`;
  }
  return `${name}={${literal(value)}}`;
}

/** `source`, then the `.describe()` label when the schema has one. */
function labelledAttributes(field: FieldDescriptor): string[] {
  const attributes = [attribute("source", field.source)];
  if (field.label !== undefined) {
    attributes.push(attribute("label", field.label));
  }
  return attributes;
}

function fieldAttributes(field: FieldDescriptor): string[] {
  const attributes = [attribute("source", field.source)];
  if (field.reference !== undefined) {
    attributes.push(attribute("reference", field.reference));
  }
  if (field.choices) attributes.push(attribute("choices", field.choices));
  for (const [name, value] of Object.entries(field.fieldProps ?? {})) {
    attributes.push(attribute(name, value));
  }
  return attributes;
}

function inputAttributes(field: FieldDescriptor): string[] {
  const attributes = labelledAttributes(field);
  if (field.reference !== undefined) {
    attributes.push(attribute("reference", field.reference));
  }
  if (field.choices) attributes.push(attribute("choices", field.choices));
  return attributes;
}

const tag = (name: string, attributes: string[]) =>
  `<${name} ${attributes.join(" ")} />`;

const openTag = (name: string, attributes: string[]) =>
  `<${name} ${attributes.join(" ")}>`;

/** `posts` and `blog-posts` become `Posts` and `BlogPosts`. */
function pascalCase(resource: string): string {
  const pascal = resource
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
  return /^\d/.test(pascal) || pascal === "" ? `Resource${pascal}` : pascal;
}

interface Printed {
  lines: string[];
  components: Set<string>;
}

const indent = (lines: string[], depth: number) =>
  lines.map((line) => `${"  ".repeat(depth)}${line}`);

function printList(fields: FieldDescriptor[]): Printed {
  const components = new Set(["List", "DataTable"]);
  const columns = fields.flatMap((field) => {
    if (field.kind === "text" || !field.field) {
      return [tag("DataTable.Col", labelledAttributes(field))];
    }
    components.add(field.field);
    return [
      openTag("DataTable.Col", labelledAttributes(field)),
      ...indent([tag(field.field, fieldAttributes(field))], 1),
      "</DataTable.Col>",
    ];
  });
  return {
    components,
    lines: [
      "<List>",
      ...indent(["<DataTable>", ...indent(columns, 1), "</DataTable>"], 1),
      "</List>",
    ],
  };
}

function printEdit(fields: FieldDescriptor[]): Printed {
  const components = new Set(["Edit", "Toolbar"]);
  const inputs = fields
    .filter((field) => !field.primary)
    .flatMap((field) => {
      if (!field.input) return [];
      components.add(field.input);
      if (field.kind !== "reference") {
        return [tag(field.input, inputAttributes(field))];
      }
      components.add("AutocompleteInput");
      return [
        openTag(field.input, inputAttributes(field)),
        ...indent(["<AutocompleteInput />"], 1),
        `</${field.input}>`,
      ];
    });
  return {
    components,
    lines: ["<Edit>", ...indent([...inputs, "<Toolbar />"], 1), "</Edit>"],
  };
}

function printShow(fields: FieldDescriptor[]): Printed {
  const components = new Set(["Show", "RecordField"]);
  const rows = fields.flatMap((field) => {
    if (field.kind === "text" || !field.field) {
      return [tag("RecordField", labelledAttributes(field))];
    }
    components.add(field.field);
    return [
      openTag("RecordField", labelledAttributes(field)),
      ...indent([tag(field.field, fieldAttributes(field))], 1),
      "</RecordField>",
    ];
  });
  return {
    components,
    lines: ["<Show>", ...indent(rows, 1), "</Show>"],
  };
}

const printers: Record<GuessedView, (fields: FieldDescriptor[]) => Printed> = {
  List: printList,
  Edit: printEdit,
  Show: printShow,
};

/**
 * The text a developer copies to turn a guessed view into their own: the
 * imports, then a component with one column, input or row per described
 * field. A field of kind `unsupported` is left out of the code and listed
 * after it.
 */
export function printGuessedView(
  view: GuessedView,
  resource: string,
  fields: FieldDescriptor[],
): string {
  const supported = fields.filter((field) => field.kind !== "unsupported");
  const { lines, components } = printers[view](supported);
  const imports = `import { ${[...components].sort().join(", ")} } from "@chelone/react";`;
  const skipped = fields
    .filter((field) => field.kind === "unsupported")
    .map((field) => {
      return `Skipped: ${field.source} (${field.reason ?? "unsupported"})`;
    });
  return [
    `Guessed ${view} for "${resource}":`,
    "",
    imports,
    "",
    `export const ${pascalCase(resource)}${view} = () => (`,
    ...indent(lines, 1),
    ");",
    ...(skipped.length > 0 ? ["", ...skipped] : []),
  ].join("\n");
}
