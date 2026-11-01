import type { DataProvider } from "../data/types";
import type {
  CsvImportError,
  CsvImportReport,
  CsvRow,
  CsvRowValidation,
} from "./types";

/**
 * Creates the valid rows `batchSize` at a time, each with its own `create`
 * call, since `DataProvider` has no bulk create. A rejected create is recorded
 * and the import goes on. An aborted `signal` stops before the next batch.
 */
export async function runCsvImport(options: {
  dataProvider: DataProvider;
  resource: string;
  validations: CsvRowValidation[];
  batchSize?: number;
  signal?: AbortSignal;
  onProgress?: (progress: { current: number; total: number }) => void;
}): Promise<CsvImportReport> {
  const {
    dataProvider,
    resource,
    validations,
    batchSize = 100,
    signal,
    onProgress,
  } = options;
  if (!(batchSize >= 1)) {
    throw new RangeError(`batchSize must be at least 1, got ${batchSize}`);
  }
  const size = Math.floor(batchSize);

  const errors: CsvImportError[] = [];
  const valid: Array<{ rowIndex: number; row: CsvRow }> = [];
  validations.forEach((validation, rowIndex) => {
    if (validation.ok) valid.push({ rowIndex, row: validation.row });
    else {
      errors.push({
        rowIndex,
        row: validation.row,
        reason: validation.issues.join("; "),
      });
    }
  });

  let created = 0;
  let current = 0;
  let aborted = false;
  for (let start = 0; start < valid.length; start += size) {
    if (signal?.aborted) {
      aborted = true;
      break;
    }
    const batch = valid.slice(start, start + size);
    const results = await Promise.allSettled(
      batch.map(({ row }) => dataProvider.create(resource, { data: row })),
    );
    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        created += 1;
        return;
      }
      const { rowIndex, row } = batch[i] as { rowIndex: number; row: CsvRow };
      errors.push({
        rowIndex,
        row,
        reason:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
      });
    });
    current += batch.length;
    onProgress?.({ current, total: valid.length });
  }

  errors.sort((a, b) => a.rowIndex - b.rowIndex);
  return {
    total: validations.length,
    created,
    failed: errors.length,
    errors,
    aborted,
  };
}

/** One flat row per error, `rowIndex` and `reason` first, for the error download. */
export function csvErrorRows(report: CsvImportReport): CsvRow[] {
  return report.errors.map(({ rowIndex, reason, row }) => ({
    rowIndex,
    reason,
    ...row,
  }));
}
