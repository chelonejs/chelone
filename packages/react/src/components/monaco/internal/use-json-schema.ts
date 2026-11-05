import type * as Monaco from "monaco-editor";
import { useEffect } from "react";

type JsonDefaults = typeof Monaco.json.jsonDefaults;
type Options = JsonDefaults["diagnosticsOptions"];
type SchemaEntry = NonNullable<Options["schemas"]>[number];

/** Every model path this add-on creates starts with this. */
const MODEL_PREFIX = "inmemory://monaco-json-input/";

interface Registration {
  entry?: SchemaEntry;
  allowComments: boolean;
  remote: boolean;
}

interface Shared {
  /** The options as they were before the first editor registered. */
  baseline: Options;
  registrations: Map<string, Registration>;
}

// Monaco's JSON diagnostics options are one object for every editor on the
// page, so the editors' needs are merged here and the baseline comes back when
// the last one unregisters.
const shared = new WeakMap<JsonDefaults, Shared>();

function apply(defaults: JsonDefaults, state: Shared): void {
  const current = defaults.diagnosticsOptions;
  const { baseline } = state;
  const registrations = [...state.registrations.values()];
  const entries = registrations.flatMap((r) => (r.entry ? [r.entry] : []));
  const comments = registrations.some((r) => r.allowComments);
  const foreign = (current.schemas ?? []).filter(
    (entry) => !entry.fileMatch?.some((m) => m.startsWith(MODEL_PREFIX)),
  );
  defaults.setDiagnosticsOptions({
    ...current,
    validate: registrations.length ? true : baseline.validate,
    // Monaco reports schema violations as warnings unless told otherwise, and
    // only errors block submit.
    schemaValidation: entries.length ? "error" : baseline.schemaValidation,
    enableSchemaRequest: registrations.some((r) => r.remote)
      ? true
      : baseline.enableSchemaRequest,
    allowComments: comments ? true : baseline.allowComments,
    trailingCommas: comments ? "ignore" : baseline.trailingCommas,
    schemas: [...foreign, ...entries],
  });
  if (!registrations.length) shared.delete(defaults);
}

function hasJsonDefaults(
  value: object,
): value is { jsonDefaults: JsonDefaults } {
  return "jsonDefaults" in value;
}

/** `monaco.json` since 0.55; older builds expose it under `monaco.languages`. */
function getJsonDefaults(monaco: typeof Monaco): JsonDefaults | undefined {
  if (monaco.json) return monaco.json.jsonDefaults;
  if ("json" in monaco.languages) {
    const legacy = monaco.languages.json;
    if (hasJsonDefaults(legacy)) return legacy.jsonDefaults;
  }
  return undefined;
}

interface UseJsonSchemaOptions {
  /** The editor's model uri: the schema applies to this model only. */
  path: string;
  schema?: object;
  schemaUri?: string;
  allowComments?: boolean;
  enabled: boolean;
}

/**
 * Registers this editor's JSON Schema and comment tolerance in Monaco's JSON
 * diagnostics, the schema matched by `fileMatch` to this editor's model, and
 * undoes it on unmount. Other editors' entries and options are left alone.
 *
 * Comment tolerance is global in Monaco: while any editor allows comments, all
 * of them stop marking comments as errors.
 */
export function useJsonSchema(
  monaco: typeof Monaco | null,
  { path, schema, schemaUri, allowComments, enabled }: UseJsonSchemaOptions,
): void {
  // Inline schemas are usually fresh literals: key the effect on their content.
  const schemaKey = schema ? JSON.stringify(schema) : undefined;

  useEffect(() => {
    if (!monaco || !enabled) return;
    if (!schemaKey && !schemaUri && !allowComments) return;
    const defaults = getJsonDefaults(monaco);
    if (!defaults) return;

    let state = shared.get(defaults);
    if (!state) {
      state = {
        baseline: defaults.diagnosticsOptions,
        registrations: new Map(),
      };
      shared.set(defaults, state);
    }
    const registered = state;
    const inline = schemaKey ? JSON.parse(schemaKey) : undefined;
    registered.registrations.set(path, {
      entry: inline
        ? {
            uri: path.replace(/\.json$/, ".schema.json"),
            fileMatch: [path],
            schema: inline,
          }
        : schemaUri
          ? { uri: schemaUri, fileMatch: [path] }
          : undefined,
      allowComments: Boolean(allowComments),
      remote: !inline && Boolean(schemaUri),
    });
    apply(defaults, registered);
    return () => {
      registered.registrations.delete(path);
      apply(defaults, registered);
    };
  }, [monaco, enabled, path, schemaKey, schemaUri, allowComments]);
}
