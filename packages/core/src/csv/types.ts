import type { StandardSchemaV1 } from "@tanstack/form-core";
import type { DataProvider } from "../data/types";
import type { LooseRecord } from "../resource/record";
import type { SourceKey } from "../resource/source-path";

/** One problem the parser found. `row` is the 1-based data row (the header row is not counted). */
export interface CsvParseError {
  code: string;
  row?: number;
  message: string;
}

/**
 * What a CSV parse hands the import flow. Every cell is a string, so a schema
 * must coerce numbers and dates itself.
 */
export interface ParsedCsv {
  headers: string[];
  rows: Array<Record<string, string>>;
  errors: CsvParseError[];
}

/**
 * The slice of papaparse's `parse` that `parseCsvWith` calls. Declared here so
 * core never imports a CSV parser; an adapter passes `Papa` in.
 */
export interface CsvParser {
  parse(
    text: string,
    options: { header: false; skipEmptyLines: "greedy" },
  ): {
    data: string[][];
    errors: Array<{
      type: string;
      code: string;
      message: string;
      row?: number | undefined;
      index?: number | undefined;
    }>;
  };
}

/** One CSV row after the mapping: field name to value. */
export type CsvRow = Record<string, unknown>;

/** Reshapes a mapped row before the schema sees it. `index` is the row's place in the file. */
export type CsvTransform = (row: CsvRow, index: number) => CsvRow;

/** The schema's verdict on one row. A valid row carries the schema's output, so coercions show. */
export type CsvRowValidation =
  | { ok: true; row: CsvRow }
  | { ok: false; row: CsvRow; issues: string[] };

/** A row the import did not create. `rowIndex` is 0-based in the file's data rows. */
export interface CsvImportError {
  rowIndex: number;
  row: CsvRow;
  reason: string;
}

export interface CsvImportReport {
  total: number;
  created: number;
  failed: number;
  errors: CsvImportError[];
  aborted: boolean;
}

export type CsvImportStep = "upload" | "map" | "preview" | "commit";

/** What the wizard shows. `mapping` is field name to CSV header, `""` for a field left unmapped. */
export interface CsvImportState {
  step: CsvImportStep;
  fileName: string | null;
  headers: string[];
  rows: Array<Record<string, string>>;
  parseError: string | null;
  fields: string[];
  requiredFields: string[];
  mapping: Record<string, string>;
  validations: CsvRowValidation[];
  /** `total` counts the valid rows the import will create. */
  progress: { current: number; total: number };
  status: "idle" | "running" | "done" | "failed";
  report: CsvImportReport | null;
  error: Error | null;
}

/**
 * `TRecord` is the schema's output, the record the import creates, so it may
 * lack `id` and is not bounded by `ResourceRecord`. Without a schema it is
 * `LooseRecord` and every field name is a plain string.
 */
export interface CsvImportOptions<TRecord = LooseRecord> {
  dataProvider: DataProvider;
  resource: string;
  // type-escape: schema: a CSV cell is a string, so the input is any value and the output is the record
  schema?: StandardSchemaV1<unknown, TRecord>;
  /** Overrides the schema's keys. Without either, the CSV headers are the fields. */
  fields?: SourceKey<TRecord>[];
  /** Overrides the schema's non-optional keys. */
  requiredFields?: SourceKey<TRecord>[];
  /** A starting field to header mapping. When non-empty it replaces the auto-match. */
  mapping?: Partial<Record<SourceKey<TRecord>, string>>;
  transform?: CsvTransform;
  batchSize?: number;
  onComplete?: (report: CsvImportReport) => void;
  onError?: (error: Error) => void;
}
