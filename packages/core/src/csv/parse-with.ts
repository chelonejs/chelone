import type { CsvParseError, CsvParser, ParsedCsv } from "./types";

const OPTIONS = { header: true, skipEmptyLines: true } as const;

// papaparse reports a one-column file as an undetectable delimiter, but a
// single column is valid CSV.
const IGNORED_CODES = new Set(["UndetectableDelimiter"]);

export function parseCsvWith(parser: CsvParser, text: string): ParsedCsv {
  const result = parser.parse(text, OPTIONS);
  const body = text.replace(/^﻿/, "");

  // papaparse counts a FieldMismatch row from 0 after dropping blank lines,
  // but counts a quote error against its raw rows, blank lines included. For
  // those, the data rows in the text up to the error's index end on its row.
  const rowOf = (error: (typeof result.errors)[number]) => {
    if (error.row === undefined) return undefined;
    if (error.type === "FieldMismatch") return error.row + 1;
    if (error.index === undefined) return error.row;
    return parser.parse(body.slice(0, error.index), OPTIONS).data.length;
  };

  const errors: CsvParseError[] = [];
  for (const error of result.errors) {
    if (IGNORED_CODES.has(error.code)) continue;
    const { code, message } = error;
    const row = rowOf(error);
    errors.push(row === undefined ? { code, message } : { code, row, message });
  }

  const headers = result.meta.fields ?? [];
  const rows = result.data.map((record) => {
    const row: Record<string, string> = {};
    for (const header of headers) row[header] = String(record[header] ?? "");
    return row;
  });

  return { headers, rows, errors };
}
