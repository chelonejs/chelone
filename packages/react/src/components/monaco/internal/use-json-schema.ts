import type { Monaco } from "@monaco-editor/react";
import { useEffect } from "react";

interface UseJsonSchemaOptions {
  /** The editor's model uri: the schema applies to this model only. */
  path: string;
  schema?: object;
  schemaUri?: string;
  allowComments?: boolean;
  enabled: boolean;
}

/**
 * Registers a JSON Schema in Monaco's JSON diagnostics, matched by `fileMatch`
 * to this editor's model, and removes the entry on unmount. The diagnostics
 * options are shared by every editor, so other entries are left alone.
 */
export function useJsonSchema(
  monaco: Monaco | null,
  { path, schema, schemaUri, allowComments, enabled }: UseJsonSchemaOptions,
): void {
  // Inline schemas are usually fresh literals: key the effect on their content.
  const schemaKey = schema ? JSON.stringify(schema) : undefined;

  // biome-ignore lint/correctness/useExhaustiveDependencies(schema): schemaKey stands for it
  useEffect(() => {
    if (!monaco || !enabled || (!schema && !schemaUri)) return;
    const defaults = monaco.languages.json.jsonDefaults;
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
