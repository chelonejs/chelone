import type * as Monaco from "monaco-editor";
import { useEffect } from "react";

interface UseJsonSchemaOptions {
  /** The editor's model uri: the schema applies to this model only. */
  path: string;
  schema?: object;
  schemaUri?: string;
  allowComments?: boolean;
  enabled: boolean;
}

type JsonDefaults = typeof Monaco.json.jsonDefaults;

/** `monaco.json` since 0.55; older builds expose it under `monaco.languages`. */
function getJsonDefaults(monaco: typeof Monaco): JsonDefaults | undefined {
  const legacy = (
    monaco.languages as unknown as { json?: { jsonDefaults?: JsonDefaults } }
  ).json;
  return monaco.json?.jsonDefaults ?? legacy?.jsonDefaults;
}

/**
 * Registers a JSON Schema in Monaco's JSON diagnostics, matched by `fileMatch`
 * to this editor's model, and removes the entry on unmount. The diagnostics
 * options are shared by every editor, so other entries are left alone.
 */
export function useJsonSchema(
  monaco: typeof Monaco | null,
  { path, schema, schemaUri, allowComments, enabled }: UseJsonSchemaOptions,
): void {
  // Inline schemas are usually fresh literals: key the effect on their content.
  const schemaKey = schema ? JSON.stringify(schema) : undefined;

  useEffect(() => {
    if (!monaco || !enabled || (!schemaKey && !schemaUri)) return;
    const schema = schemaKey ? JSON.parse(schemaKey) : undefined;
    const defaults = getJsonDefaults(monaco);
    if (!defaults) return;
    const others = () =>
      (defaults.diagnosticsOptions.schemas ?? []).filter(
        (entry) => !entry.fileMatch?.includes(path),
      );
    const entry = schema
      ? {
          uri: path.replace(/\.json$/, ".schema.json"),
          fileMatch: [path],
          schema,
        }
      : { uri: schemaUri as string, fileMatch: [path] };
    defaults.setDiagnosticsOptions({
      ...defaults.diagnosticsOptions,
      validate: true,
      // Monaco reports schema violations as warnings unless told otherwise,
      // and only errors block submit.
      schemaValidation: "error",
      enableSchemaRequest: schema ? undefined : true,
      ...(allowComments && { allowComments: true, trailingCommas: "ignore" }),
      schemas: [...others(), entry],
    });
    return () => {
      defaults.setDiagnosticsOptions({
        ...defaults.diagnosticsOptions,
        schemas: others(),
      });
    };
  }, [monaco, enabled, path, schemaKey, schemaUri, allowComments]);
}
