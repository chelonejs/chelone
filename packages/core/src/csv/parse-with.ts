import type { CsvParseError, CsvParser, ParsedCsv } from "./types";

// papaparse reports a one-column file as an undetectable delimiter, but a
// single column is valid CSV.
const IGNORED_CODES = new Set(["UndetectableDelimiter"]);

// Papaparse counts FieldMismatch rows from 0 but reports quote errors against
// the header-inclusive 0-based index, which is already the 1-based data row.
const toRow = (type: string, row: number | undefined) =>
  row === undefined ? undefined : type === "FieldMismatch" ? row + 1 : row;

export function parseCsvWith(parser: CsvParser, text: string): ParsedCsv {
  const result = parser.parse(text, { header: true, skipEmptyLines: true });

  const errors: CsvParseError[] = [];
  for (const { type, code, message, row } of result.errors) {
    if (IGNORED_CODES.has(code)) continue;
    const mapped = toRow(type, row);
    errors.push(
      mapped === undefined ? { code, message } : { code, row: mapped, message },
    );
  }

  const headers = result.meta.fields ?? [];
  const rows = result.data.map((record) => {
    const row: Record<string, string> = {};
    for (const header of headers) row[header] = String(record[header] ?? "");
    return row;
  });

  return { headers, rows, errors };
}
