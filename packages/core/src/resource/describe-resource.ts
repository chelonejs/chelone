import { isRecord } from "../guards";
import type { ResourceConfig } from "./registry";
import type { AnySourcePath } from "./source-path";

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

/**
 * `TSource` is the registry-wide {@link AnySourcePath} by default, so a guesser
 * hands `source` to a `source` prop whether or not the app registered resources.
 * A block's attrs are not resource paths and name `FieldDescriptor<string>`.
 */
export interface FieldDescriptor<TSource extends string = AnySourcePath> {
  source: TSource;
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
 * What this module reads from a schema, whichever Zod major built it. Zod 3 is
 * read through `_def.typeName` and Zod 4 through `_zod.def.type`, rather than
 * `instanceof`, so a schema built by another copy of zod still describes. A
 * schema from any other Standard Schema library has neither and reads as
 * `unknown`.
 */
interface Node {
  /** Lowercase, shared by both majors: `string`, `optional`, `enum`, `array`... */
  type: string;
  /** String format checks: `email`, `url`, `date`, `datetime`. */
  formats: Set<string>;
  /** An enum's declared entries; a native enum's include its reverse keys. */
  entries?: Record<string, string | number>;
  /** A union's members. */
  options?: unknown[];
  /** A literal's value. */
  value?: unknown;
  /** An array's element schema. */
  element?: unknown;
  shape?: Record<string, unknown>;
  /** The schema a wrapper (optional, default, pipe...) hands on to. */
  inner?: unknown;
}

type Bag = Record<string, unknown>;

const bagOf = (value: unknown): Bag | undefined =>
  isRecord(value) ? value : undefined;

/** A Zod 3 enum's `values`: the declared strings, in declaration order. */
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/** A native enum's `values` or a Zod 4 enum's `entries`: each key to its value. */
const isEnumEntries = (
  value: unknown,
): value is Record<string, string | number> =>
  isRecord(value) &&
  Object.values(value).every(
    (item) => typeof item === "string" || typeof item === "number",
  );

/** A union's `options`, or a Zod 4 literal's `values`. */
const isUnknownArray = (value: unknown): value is unknown[] =>
  Array.isArray(value);

/** A Zod 3 object's `shape` is a function over its keys, not the keys themselves. */
const isShapeFunction = (value: unknown): value is () => unknown =>
  typeof value === "function";

const stripZod = (typeName: string) =>
  typeName.replace(/^Zod/, "").toLowerCase();

const formatsOf = (checks: unknown, format: unknown) => {
  const formats = new Set<string>();
  if (typeof format === "string") formats.add(format);
  if (Array.isArray(checks)) {
    for (const check of checks) {
      // A Zod 3 check is `{ kind }`; a Zod 4 check is a schema over `_zod.def`.
      const legacy = bagOf(check)?.kind;
      const modern = bagOf(bagOf(bagOf(check)?._zod)?.def)?.format;
      for (const found of [legacy, modern]) {
        if (typeof found === "string") formats.add(found);
      }
    }
  }
  return formats;
};

function readZod3(def: Bag): Node {
  const typeName = typeof def.typeName === "string" ? def.typeName : "";
  const node: Node = {
    type: stripZod(typeName),
    formats: formatsOf(def.checks, undefined),
  };
  switch (typeName) {
    case "ZodOptional":
    case "ZodNullable":
    case "ZodDefault":
    case "ZodCatch":
    case "ZodReadonly":
      node.inner = def.innerType;
      break;
    case "ZodBranded":
      node.inner = def.type;
      break;
    case "ZodEffects":
      node.inner = def.schema;
      break;
    case "ZodPipeline":
      node.inner = def.in;
      break;
    case "ZodEnum":
      if (isStringArray(def.values)) {
        node.entries = Object.fromEntries(
          def.values.map((value) => [value, value]),
        );
      }
      break;
    case "ZodNativeEnum":
      node.type = "enum";
      if (isEnumEntries(def.values)) node.entries = def.values;
      break;
    case "ZodUnion":
      if (isUnknownArray(def.options)) node.options = def.options;
      break;
    case "ZodLiteral":
      node.value = def.value;
      break;
    case "ZodArray":
      node.element = def.type;
      break;
    case "ZodObject": {
      const shape = isShapeFunction(def.shape) ? def.shape() : undefined;
      if (isRecord(shape)) node.shape = shape;
      break;
    }
  }
  return node;
}

function readZod4(def: Bag): Node {
  const type = typeof def.type === "string" ? def.type : "";
  const node: Node = {
    type,
    formats: formatsOf(def.checks, def.format),
  };
  switch (type) {
    case "optional":
    case "nullable":
    case "nonoptional":
    case "default":
    case "prefault":
    case "catch":
    case "readonly":
      node.inner = def.innerType;
      break;
    case "pipe": {
      // `z.preprocess(fn, schema)` is `fn` piped into `schema`: the field is the schema.
      const into = bagOf(bagOf(bagOf(def.in)?._zod)?.def)?.type;
      node.inner = into === "transform" ? def.out : def.in;
      break;
    }
    case "enum":
      if (isEnumEntries(def.entries)) node.entries = def.entries;
      break;
    case "union":
      if (isUnknownArray(def.options)) node.options = def.options;
      break;
    case "literal": {
      const values = isUnknownArray(def.values) ? def.values : undefined;
      node.value = values?.[0];
      // A literal of several values is not one choice.
      if (values?.length !== 1) node.type = "literals";
      break;
    }
    case "array":
      node.element = def.element;
      break;
    case "object":
      if (isRecord(def.shape)) node.shape = def.shape;
      break;
  }
  return node;
}

function read(schema: unknown): Node {
  const zod4 = bagOf(bagOf(bagOf(schema)?._zod)?.def);
  if (zod4) return readZod4(zod4);
  const zod3 = bagOf(bagOf(schema)?._def);
  if (zod3) return readZod3(zod3);
  return { type: "unknown", formats: new Set() };
}

const descriptionOf = (schema: unknown) => {
  const description = bagOf(schema)?.description;
  return typeof description === "string" ? description : undefined;
};

interface Unwrapped {
  node: Node;
  label?: string;
}

function unwrap(schema: unknown): Unwrapped {
  let current = schema;
  let label: string | undefined;
  // A wrapper cycle is not possible in Zod; the bound only guards a malformed def.
  for (let depth = 0; depth < 64; depth++) {
    const node = read(current);
    label ??= descriptionOf(current);
    if (node.inner === undefined) return { node, label };
    current = node.inner;
  }
  return { node: read(current), label };
}

const unsupported = (reason: string) => ({
  kind: "unsupported" as const,
  reason,
});

type Described = Omit<FieldDescriptor, "source" | "primary" | "label">;

function describeString({ formats }: Node): Described {
  if (formats.has("datetime")) {
    return {
      kind: "dateTime",
      field: "DateField",
      input: "DateTimeInput",
      fieldProps: { showTime: true },
    };
  }
  if (formats.has("date")) {
    return { kind: "date", field: "DateField", input: "DateInput" };
  }
  if (formats.has("email")) {
    return { kind: "email", field: "EmailField", input: "TextInput" };
  }
  if (formats.has("url")) {
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

function describeEnum({ entries = {} }: Node): Described {
  // A numeric enum also maps each value back to its key; those keys point at a
  // number-valued entry in turn, which a declared key never does.
  const ids: (string | number)[] = [];
  for (const key of Object.keys(entries)) {
    const value = entries[key];
    if (value === undefined || typeof entries[value] === "number") continue;
    ids.push(value);
  }
  return select(toChoices(ids));
}

function describeUnion({ options = [] }: Node): Described {
  const ids: (string | number)[] = [];
  for (const option of options) {
    const { node: member } = unwrap(option);
    const value = member.value;
    if (
      member.type !== "literal" ||
      (typeof value !== "string" && typeof value !== "number")
    ) {
      return unsupported("union schema");
    }
    ids.push(value);
  }
  return select(toChoices(ids));
}

function describeArray({ element }: Node): Described {
  const member = element === undefined ? undefined : unwrap(element).node;
  if (member?.type === "string") {
    return {
      kind: "textArray",
      field: "TextArrayField",
      input: "TextArrayInput",
    };
  }
  if (member?.type === "object") return unsupported("array of objects");
  return unsupported(`array of ${member?.type ?? "unknown"}s`);
}

function describeKind(node: Node): Described {
  switch (node.type) {
    case "string":
      return describeString(node);
    case "number":
      return { kind: "number", field: "NumberField", input: "NumberInput" };
    case "boolean":
      return { kind: "boolean", field: "BooleanField", input: "BooleanInput" };
    case "date":
      return { kind: "date", field: "DateField", input: "DateInput" };
    case "enum":
      return describeEnum(node);
    case "union":
      return describeUnion(node);
    case "array":
      return describeArray(node);
    default:
      return unsupported(`${node.type || "unknown"} schema`);
  }
}

/** For core's block editor helpers; not exported from the package index. */
export function describeField<TSource extends string>(
  source: TSource,
  // type-escape: schema: a registered schema is any Standard Schema value, read structurally
  schema: unknown,
  references: ResourceConfig["references"],
): FieldDescriptor<TSource> {
  const { node, label } = unwrap(schema);
  const target =
    references && Object.hasOwn(references, source)
      ? references[source]
      : undefined;
  const described: Described =
    target === undefined
      ? describeKind(node)
      : node.type === "array"
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
 * Turns a resource's registered Zod schema (Zod 3 or Zod 4) into one descriptor per field, in
 * schema key order. Returns `undefined` when there is no schema to read or it
 * is not an object. Both adapters' guessers build their views from this, never
 * from fetched values.
 */
export function describeResource(
  resource: string,
  config: ResourceConfig | undefined,
): ResourceDescriptor | undefined {
  if (!config?.schema) return undefined;
  const { node } = unwrap(config.schema);
  if (node.type !== "object" || !node.shape) return undefined;
  const { shape } = node;
  return {
    resource,
    // type-escape: schema: the keys come from the registered schema's shape at runtime, which TypeScript cannot connect to the schema's type
    fields: Object.keys(shape).map((source) =>
      describeField(source, shape[source], config.references),
    ) as FieldDescriptor[],
  };
}
