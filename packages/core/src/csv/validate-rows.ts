import type { StandardSchemaV1 } from "@tanstack/form-core";
import type { CsvRow, CsvRowValidation, CsvTransform } from "./types";

/** Copies `row[header]` to `field` for each mapping entry; a field mapped to `""` is skipped. */
export function applyCsvMapping(
  row: Record<string, unknown>,
  mapping: Record<string, string>,
): CsvRow {
  // fromEntries defines own properties, so a field named "__proto__" stays data.
  return Object.fromEntries(
    Object.entries(mapping)
      .filter(([, header]) => header !== "")
      .map(([field, header]) => [field, row[header]]),
  );
}

/**
 * Lists a zod object's keys, and the ones whose schema is not optional. Any
 * other schema has no `shape` to read and yields no fields.
 */
export function csvSchemaFields(schema: unknown): {
  fields: string[];
  required: string[];
} {
  const shape = (schema as { shape?: unknown } | null | undefined)?.shape;
  if (typeof shape !== "object" || shape === null) {
    return { fields: [], required: [] };
  }
  const entries = Object.entries(shape as Record<string, unknown>);
  return {
    fields: entries.map(([key]) => key),
    required: entries
      .filter(
        ([, field]) =>
          !(field as { isOptional?: () => boolean } | null)?.isOptional?.(),
      )
      .map(([key]) => key),
  };
}

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const issuePath = (
  path: ReadonlyArray<PropertyKey | { key: PropertyKey }> | undefined,
) =>
  (path ?? [])
    .map((segment) =>
      typeof segment === "object" ? String(segment.key) : String(segment),
    )
    .join(".");

/**
 * Maps each row, runs `transform`, then the schema, and returns one verdict
 * per row. A valid row carries the schema's output, so a coercion shows in it.
 * A transform that throws makes only its own row invalid.
 */
export async function validateCsvRows(
  rows: Array<Record<string, unknown>>,
  options: {
    mapping: Record<string, string>;
    schema?: StandardSchemaV1;
    transform?: CsvTransform;
  },
): Promise<CsvRowValidation[]> {
  const { mapping, schema, transform } = options;
  return Promise.all(
    rows.map(async (source, index): Promise<CsvRowValidation> => {
      let row = applyCsvMapping(source, mapping);
      if (transform) {
        try {
          row = transform(row, index);
        } catch (error) {
          return { ok: false, row, issues: [message(error)] };
        }
      }
      if (!schema) return { ok: true, row };

      const result = await schema["~standard"].validate(row);
      if (!result.issues) return { ok: true, row: result.value as CsvRow };
      return {
        ok: false,
        row,
        issues: result.issues.map((issue) => {
          const path = issuePath(issue.path);
          return path === "" ? issue.message : `${path}: ${issue.message}`;
        }),
      };
    }),
  );
}
