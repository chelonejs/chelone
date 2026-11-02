import type { CsvParseError, CsvParser, ParsedCsv } from "./types";

// "greedy" also drops a row of empty cells, like the `,` rows Excel appends.
// papaparse reads the header as a plain row: its own header mode would lose the
// cell under a `__proto__` header and rename a repeated or empty one itself.
const OPTIONS = { header: false, skipEmptyLines: "greedy" } as const;

// papaparse reports a one-column file as an undetectable delimiter, but a
// single column is valid CSV.
const IGNORED_CODES = new Set(["UndetectableDelimiter"]);

export function parseCsvWith(parser: CsvParser, text: string): ParsedCsv {
  const result = parser.parse(text, OPTIONS);
  const body = text.replace(/^﻿/, "");
  const [headerRow = [], ...records] = result.data;
  const headers = nameHeaders(headerRow);

  // papaparse counts a quote error against its raw rows, blank lines included.
  // The data rows in the text up to the error's index end on its row.
  const rowOf = (error: (typeof result.errors)[number]) => {
    if (error.row === undefined) return undefined;
    if (error.index === undefined) return error.row;
    const rows = parser.parse(body.slice(0, error.index), OPTIONS).data.length;
    return Math.max(rows - 1, 0);
  };

  const errors: CsvParseError[] = [];
  for (const error of result.errors) {
    if (IGNORED_CODES.has(error.code)) continue;
    const { code, message } = error;
    const row = rowOf(error);
    errors.push(row === undefined ? { code, message } : { code, row, message });
  }
  records.forEach((record, index) => {
    if (record.length === headers.length) return;
    const few = record.length < headers.length;
    errors.push({
      code: few ? "TooFewFields" : "TooManyFields",
      row: index + 1,
      message: `Too ${few ? "few" : "many"} fields: expected ${headers.length} fields but parsed ${record.length}`,
    });
  });

  const rows = records.map((record) =>
    Object.fromEntries(
      headers.map((header, index) => [header, record[index] ?? ""]),
    ),
  );

  return { headers, rows, errors };
}

// Trims, names an empty header by its 1-based column, and renames a repeat to
// name_1, name_2, skipping a name the file already uses.
function nameHeaders(cells: string[]): string[] {
  const trimmed = cells.map(
    (cell, index) => cell.trim() || `column_${index + 1}`,
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
