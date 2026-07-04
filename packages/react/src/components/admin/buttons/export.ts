/**
 * Export helpers for `<ExportButton>` / `<BulkExportButton>`.
 *
 * ra-core / shadmin lean on `jsonexport` + a `downloadCSV` util and an
 * `Exporter` type that receives `(data, fetchRelatedRecords, dataProvider,
 * resource)`. Chelone has NO `jsonexport` dep and no `fetchRelatedRecords`
 * helper, so this module ships a dependency-free replacement:
 *
 * - `Exporter` — the same call-site shape shadmin uses, minus the
 *   `fetchRelatedRecords` argument (chelone has no relation-fetch helper yet):
 *   `(data, dataProvider, resource) => void | Promise<void>`.
 * - `defaultExporter` — flattens the record union of keys into a CSV and
 *   triggers a browser download via {@link downloadCSV}.
 * - `downloadCSV` — a Blob + anchor-click download (no-op in a non-DOM env,
 *   e.g. SSR/tests-without-jsdom).
 *
 * A consuming app that wants richer export (nested relations, custom columns)
 * passes its own `exporter` prop — the button never assumes the default.
 */

import type { DataProvider, LooseRecord } from "@chelone/core";

/**
 * Turns a page of records into a downloaded file. Called by the export buttons
 * with the fetched rows, the raw dataProvider (for follow-up fetches), and the
 * resource name.
 */
export type Exporter<TRecord extends LooseRecord = LooseRecord> = (
  data: TRecord[],
  dataProvider: DataProvider,
  resource: string,
) => void | Promise<void>;

/** Escape one CSV cell: wrap in quotes + double any embedded quote when needed. */
function csvCell(value: unknown): string {
  if (value == null) return "";
  const raw = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

/**
 * Serialize records to CSV text. Columns are the UNION of every record's keys,
 * in first-seen order — so a sparse record still lines up under the right
 * header. Returns an empty string for an empty dataset.
 */
export function recordsToCSV(data: readonly LooseRecord[]): string {
  if (data.length === 0) return "";
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const record of data) {
    for (const key of Object.keys(record)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }
  const header = columns.map(csvCell).join(",");
  const rows = data.map((record) =>
    columns.map((col) => csvCell(record[col])).join(","),
  );
  return [header, ...rows].join("\n");
}

/**
 * Trigger a browser download of `csv` as `<filename>.csv`. A DOM-guarded no-op
 * when there is no `document` (SSR / non-jsdom test env) so callers never crash
 * off-DOM.
 */
export function downloadCSV(csv: string, filename: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Release the object URL on the next tick (after the click has been handled).
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * The built-in exporter: serialize `data` to CSV (union-of-keys columns) and
 * download it as `<resource>.csv`. Apps needing nested/related data pass a
 * custom `exporter` prop instead.
 */
export const defaultExporter: Exporter = (data, _dataProvider, resource) => {
  downloadCSV(recordsToCSV(data), resource);
};
