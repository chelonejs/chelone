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
    options: { header: true; skipEmptyLines: true },
  ): {
    data: Array<Record<string, unknown>>;
    errors: Array<{
      type: string;
      code: string;
      message: string;
      row?: number | undefined;
      index?: number | undefined;
    }>;
    meta: { fields?: string[] | undefined };
  };
}
