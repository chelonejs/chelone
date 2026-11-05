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
export function csvSchemaFields(schema: StandardSchemaV1 | undefined): {
  fields: string[];
  required: string[];
} {
  const shape = schema && "shape" in schema ? schema.shape : undefined;
  if (typeof shape !== "object" || shape === null) {
    return { fields: [], required: [] };
  }
  const entries: Array<[string, unknown]> = Object.entries(shape);
  return {
    fields: entries.map(([key]) => key),
    required: entries
      .filter(([, field]) => !isOptionalField(field))
      .map(([key]) => key),
  };
}

const isOptionalField = (field: unknown): boolean =>
  typeof field === "object" &&
  field !== null &&
  "isOptional" in field &&
  typeof field.isOptional === "function" &&
  Boolean(field.isOptional());

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
 * A transform or schema that throws makes only its own row invalid.
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

      let result: Awaited<
        ReturnType<StandardSchemaV1["~standard"]["validate"]>
      >;
      try {
        result = await schema["~standard"].validate(row);
      } catch (error) {
        return { ok: false, row, issues: [message(error)] };
      }
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
