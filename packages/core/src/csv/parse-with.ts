import type { CsvParseError, CsvParser, ParsedCsv } from "./types";

// "greedy" also drops a row of empty cells, like the `,` rows Excel appends.
// Each header is keyed by its position while papaparse reads, because papaparse
// would lose the cell under a `__proto__` header and rename a repeat or an
// empty one itself. The names are worked out below.
const options = (onHeader?: (header: string, index: number) => void) =>
  ({
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header: string, index: number) => {
      onHeader?.(header, index);
      return String(index);
    },
  }) as const;

// papaparse reports a one-column file as an undetectable delimiter, but a
// single column is valid CSV.
const IGNORED_CODES = new Set(["UndetectableDelimiter"]);

export function parseCsvWith(parser: CsvParser, text: string): ParsedCsv {
  const original: string[] = [];
  const result = parser.parse(
    text,
    options((header, index) => {
      original[index] = header;
    }),
  );
  const body = text.replace(/^﻿/, "");

  // papaparse counts a FieldMismatch row from 0 after dropping blank lines,
  // but counts a quote error against its raw rows, blank lines included. For
  // those, the data rows in the text up to the error's index end on its row.
  const rowOf = (error: (typeof result.errors)[number]) => {
    if (error.row === undefined) return undefined;
    if (error.type === "FieldMismatch") return error.row + 1;
    if (error.index === undefined) return error.row;
    return parser.parse(body.slice(0, error.index), options()).data.length;
  };

  const errors: CsvParseError[] = [];
  for (const error of result.errors) {
    if (IGNORED_CODES.has(error.code)) continue;
    const { code, message } = error;
    const row = rowOf(error);
    errors.push(row === undefined ? { code, message } : { code, row, message });
  }

  const headers = nameHeaders(original);
  const rows = result.data.map((record) =>
    Object.fromEntries(
      headers.map((header, index) => [
        header,
        String(record[String(index)] ?? ""),
      ]),
    ),
  );

  return { headers, rows, errors };
}

// Trims, names an empty header by its 1-based column, and renames a repeat to
// name_1, name_2, skipping a name the file already uses.
function nameHeaders(original: string[]): string[] {
  const trimmed = original.map(
    (header, index) => header.trim() || `column_${index + 1}`,
  );
  const taken = new Set(trimmed);
  const seen = new Set<string>();
  return trimmed.map((header) => {
    if (!seen.has(header)) {
      seen.add(header);
      return header;
    }
    let n = 1;
    while (taken.has(`${header}_${n}`)) n += 1;
    const renamed = `${header}_${n}`;
    taken.add(renamed);
    seen.add(renamed);
    return renamed;
  });
}
