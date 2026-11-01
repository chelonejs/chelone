import type { z } from "zod";
import type { ResourceConfig } from "./registry";

/** The field components both adapters export. Each adapter keeps one exhaustive map over this. */
export type FieldComponentName =
  | "TextField"
  | "EmailField"
  | "UrlField"
  | "NumberField"
  | "BooleanField"
  | "DateField"
  | "SelectField"
  | "TextArrayField"
  | "ReferenceField"
  | "ReferenceArrayField";

/** The input components both adapters export. */
export type InputComponentName =
  | "TextInput"
  | "NumberInput"
  | "BooleanInput"
  | "DateInput"
  | "DateTimeInput"
  | "SelectInput"
  | "TextArrayInput"
  | "ReferenceInput"
  | "ReferenceArrayInput";

export type FieldKind =
  | "text"
  | "email"
  | "url"
  | "number"
  | "boolean"
  | "date"
  | "dateTime"
  | "select"
  | "textArray"
  | "reference"
  | "referenceArray"
  | "unsupported";

export interface FieldDescriptor {
  source: string;
  kind: FieldKind;
  /** True for the `id` field. */
  primary: boolean;
  /** The first `.describe()` text met while unwrapping; absent so the adapter labels from `source`. */
  label?: string;
  field?: FieldComponentName;
  input?: InputComponentName;
  fieldProps?: Record<string, unknown>;
  /** The target resource of a `reference` or `referenceArray`. */
  reference?: string;
  /** The options of a `select`; `name` is the raw value, the adapter's input translates it. */
  choices?: { id: string | number; name: string }[];
  /** Why the field is `unsupported`. */
  reason?: string;
}

export interface ResourceDescriptor {
  resource: string;
  fields: FieldDescriptor[];
}

/**
 * The parts of a Zod 3 `_def` this module reads. Read through `typeName`
 * rather than `instanceof`, so a schema built by another copy of zod still
 * describes. A Zod 4 schema has no `typeName` and describes as `undefined`.
 */
interface Def {
  typeName?: string;
  description?: string;
  innerType?: z.ZodTypeAny;
  schema?: z.ZodTypeAny;
  type?: z.ZodTypeAny;
  in?: z.ZodTypeAny;
  checks?: { kind: string }[];
  values?: readonly string[] | Record<string, string | number>;
  options?: z.ZodTypeAny[];
  value?: unknown;
  shape?: () => Record<string, z.ZodTypeAny>;
}

const defOf = (schema: z.ZodTypeAny): Def => schema._def as Def;

interface Unwrapped {
  def: Def;
  label?: string;
}

function unwrap(schema: z.ZodTypeAny): Unwrapped {
  let current = schema;
  let label: string | undefined;
  // A wrapper cycle is not possible in Zod; the bound only guards a malformed def.
  for (let depth = 0; depth < 64; depth++) {
    const def = defOf(current);
    label ??= def.description;
    let next: z.ZodTypeAny | undefined;
    switch (def.typeName) {
      case "ZodOptional":
      case "ZodNullable":
      case "ZodDefault":
      case "ZodCatch":
      case "ZodReadonly":
        next = def.innerType;
        break;
      case "ZodBranded":
        next = def.type;
        break;
      case "ZodEffects":
        next = def.schema;
        break;
      case "ZodPipeline":
        next = def.in;
        break;
    }
    if (!next) return { def, label };
    current = next;
  }
  return { def: defOf(current), label };
}

const unsupported = (reason: string) => ({
  kind: "unsupported" as const,
  reason,
});

const reasonOf = (typeName: string | undefined) =>
  `${(typeName ?? "unknown").replace(/^Zod/, "").toLowerCase()} schema`;

type Described = Omit<FieldDescriptor, "source" | "primary" | "label">;

function describeString(def: Def): Described {
  const kinds = new Set((def.checks ?? []).map((check) => check.kind));
  if (kinds.has("datetime")) {
    return {
      kind: "dateTime",
      field: "DateField",
      input: "DateTimeInput",
      fieldProps: { showTime: true },
    };
  }
  if (kinds.has("date")) {
    return { kind: "date", field: "DateField", input: "DateInput" };
  }
  if (kinds.has("email")) {
    return { kind: "email", field: "EmailField", input: "TextInput" };
  }
  if (kinds.has("url")) {
    return { kind: "url", field: "UrlField", input: "TextInput" };
  }
  return { kind: "text", field: "TextField", input: "TextInput" };
}

function select(choices: { id: string | number; name: string }[]): Described {
  return {
    kind: "select",
    field: "SelectField",
    input: "SelectInput",
    choices,
  };
}

const toChoices = (ids: (string | number)[]) =>
  ids.map((id) => ({ id, name: String(id) }));

function describeNativeEnum(def: Def): Described {
  const enumObject = def.values as Record<string, string | number>;
  // A numeric enum also maps each value back to its key; those keys point at a
  // number-valued entry in turn, which a declared key never does.
  const ids = Object.keys(enumObject)
    .filter((key) => typeof enumObject[enumObject[key] as string] !== "number")
    .map((key) => enumObject[key] as string | number);
  return select(toChoices(ids));
}

function describeUnion(def: Def): Described {
  const ids: (string | number)[] = [];
  for (const option of def.options ?? []) {
    const { def: member } = unwrap(option);
    const value = member.value;
    if (
      member.typeName !== "ZodLiteral" ||
      (typeof value !== "string" && typeof value !== "number")
    ) {
      return unsupported("union schema");
    }
    ids.push(value);
  }
  return select(toChoices(ids));
}

function describeArray(def: Def): Described {
  const element = def.type ? unwrap(def.type).def : undefined;
  if (element?.typeName === "ZodString") {
    return {
      kind: "textArray",
      field: "TextArrayField",
      input: "TextArrayInput",
    };
  }
  if (element?.typeName === "ZodObject") return unsupported("array of objects");
  return unsupported(
    `array of ${(element?.typeName ?? "unknown").replace(/^Zod/, "").toLowerCase()}s`,
  );
}

function describeKind(def: Def): Described {
  switch (def.typeName) {
    case "ZodString":
      return describeString(def);
    case "ZodNumber":
      return { kind: "number", field: "NumberField", input: "NumberInput" };
    case "ZodBoolean":
      return { kind: "boolean", field: "BooleanField", input: "BooleanInput" };
    case "ZodDate":
      return { kind: "date", field: "DateField", input: "DateInput" };
    case "ZodEnum":
      return select(toChoices([...(def.values as readonly string[])]));
    case "ZodNativeEnum":
      return describeNativeEnum(def);
    case "ZodUnion":
      return describeUnion(def);
    case "ZodArray":
      return describeArray(def);
    default:
      return unsupported(reasonOf(def.typeName));
  }
}

function describeField(
  source: string,
  schema: z.ZodTypeAny,
  references: ResourceConfig["references"],
): FieldDescriptor {
  const { def, label } = unwrap(schema);
  const target =
    references && Object.hasOwn(references, source)
      ? references[source]
      : undefined;
  const described: Described =
    target === undefined
      ? describeKind(def)
      : def.typeName === "ZodArray"
        ? {
            kind: "referenceArray",
            field: "ReferenceArrayField",
            input: "ReferenceArrayInput",
            reference: target,
          }
        : {
            kind: "reference",
            field: "ReferenceField",
            input: "ReferenceInput",
            reference: target,
          };
  return {
    source,
    primary: source === "id",
    ...(label === undefined ? {} : { label }),
    ...described,
  };
}

/**
 * Turns a resource's registered Zod schema into one descriptor per field, in
 * schema key order. Returns `undefined` when there is no schema to read or it
 * is not an object. Both adapters' guessers build their views from this, never
 * from fetched values.
 */
export function describeResource(
  resource: string,
  config: ResourceConfig | undefined,
): ResourceDescriptor | undefined {
  if (!config?.schema) return undefined;
  const { def } = unwrap(config.schema);
  if (def.typeName !== "ZodObject" || typeof def.shape !== "function") {
    return undefined;
  }
  const shape = def.shape();
  return {
    resource,
    fields: Object.keys(shape).map((source) =>
      describeField(source, shape[source] as z.ZodTypeAny, config.references),
    ),
  };
}
