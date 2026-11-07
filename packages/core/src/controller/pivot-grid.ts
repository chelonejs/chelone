/**
 * Pure rule for pivoting a flat record list into a row by column table. No
 * react, no vue: both PivotGrid adapters build the same table from the same
 * records and print numbers the same way.
 */

import { getAtPath } from "../resource/get-at-path";
import type { SourceProp } from "../resource/source-path";

export type PivotAggregator = "count" | "sum" | "avg" | "min" | "max";

export interface PivotOptions<R> {
  rowSource: SourceProp<R>;
  columnSource: SourceProp<R>;
  /** Read by every aggregator but `count`. */
  valueSource?: SourceProp<R>;
  /** Defaults to `count`. */
  aggregator?: PivotAggregator;
}

export interface PivotTable {
  rowKeys: string[];
  columnKeys: string[];
  /** `cells[row][column]` follows the order of `rowKeys` and `columnKeys`. */
  cells: (number | null)[][];
  rowTotals: (number | null)[];
  columnTotals: (number | null)[];
  grandTotal: number | null;
}

// What one group of records contributes: how many, and their usable values.
interface Group {
  count: number;
  values: number[];
}

const collator = new Intl.Collator(undefined, { numeric: true });

const NUMERIC_KEY = /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

// The collator reads digit runs as whole numbers but not a sign or a decimal
// point, so two numeric keys compare by value here and the collator orders the
// rest, and breaks a tie such as "1" and "1.0".
const compareKeys = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a === "") return 1;
  if (b === "") return -1;
  if (NUMERIC_KEY.test(a) && NUMERIC_KEY.test(b)) {
    const difference = Number(a) - Number(b);
    if (difference !== 0 && !Number.isNaN(difference)) return difference;
  }
  return collator.compare(a, b) || (a < b ? -1 : 1);
};

const toKey = (value: unknown): string =>
  value == null || value === "" ? "" : String(value);

// A null is never read as 0, and a boolean is not a number.
const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const aggregate = (
  group: Group,
  aggregator: PivotAggregator,
): number | null => {
  if (group.count === 0) return null;
  if (aggregator === "count") return group.count;
  const { values } = group;
  if (values.length === 0) return null;
  switch (aggregator) {
    case "sum":
      return values.reduce((total, value) => total + value, 0);
    case "avg":
      return values.reduce((total, value) => total + value, 0) / values.length;
    case "min":
      return values.reduce((a, b) => (b < a ? b : a));
    case "max":
      return values.reduce((a, b) => (b > a ? b : a));
  }
};

const newGroup = (): Group => ({ count: 0, values: [] });

const getOrCreate = <K, V>(map: Map<K, V>, key: K, create: () => V): V => {
  const existing = map.get(key);
  if (existing !== undefined) return existing;
  const created = create();
  map.set(key, created);
  return created;
};

const add = (group: Group, value: number | undefined): void => {
  group.count += 1;
  if (value !== undefined) group.values.push(value);
};

/**
 * A row or column key is `String(value)`, and a null, undefined or empty value
 * is the key `""`. Keys sort numerically (`10` after `9`) with `""` last.
 * `count` counts records and ignores `valueSource`. The other aggregators use
 * finite numbers and numeric strings, and skip anything else. A cell with no
 * records is `null`, and so is a cell with no usable value, unless it counts.
 * A total aggregates the raw values of its row, column or table, never the
 * cell results, so an average total is not a sum of averages.
 */
export function buildPivotTable<R>(
  records: readonly R[],
  options: PivotOptions<R>,
): PivotTable {
  const {
    rowSource,
    columnSource,
    valueSource,
    aggregator = "count",
  } = options;
  const readsValue = aggregator !== "count" && valueSource !== undefined;

  // Maps, so a key such as `__proto__` is an ordinary row.
  const cellGroups = new Map<string, Map<string, Group>>();
  const rowGroups = new Map<string, Group>();
  const columnGroups = new Map<string, Group>();
  const tableGroup = newGroup();

  for (const record of records) {
    const row = toKey(getAtPath(record, rowSource));
    const column = toKey(getAtPath(record, columnSource));
    const value = readsValue
      ? toNumber(getAtPath(record, valueSource))
      : undefined;

    const cellRow = getOrCreate(cellGroups, row, () => new Map());
    const cell = getOrCreate(cellRow, column, newGroup);
    const rowGroup = getOrCreate(rowGroups, row, newGroup);
    const columnGroup = getOrCreate(columnGroups, column, newGroup);

    add(cell, value);
    add(rowGroup, value);
    add(columnGroup, value);
    add(tableGroup, value);
  }

  const rowKeys = [...rowGroups.keys()].sort(compareKeys);
  const columnKeys = [...columnGroups.keys()].sort(compareKeys);
  const empty = newGroup();

  return {
    rowKeys,
    columnKeys,
    cells: rowKeys.map((row) =>
      columnKeys.map((column) =>
        aggregate(cellGroups.get(row)?.get(column) ?? empty, aggregator),
      ),
    ),
    rowTotals: rowKeys.map((row) =>
      aggregate(rowGroups.get(row) as Group, aggregator),
    ),
    columnTotals: columnKeys.map((column) =>
      aggregate(columnGroups.get(column) as Group, aggregator),
    ),
    grandTotal: aggregate(tableGroup, aggregator),
  };
}

/** Integers print bare and fractions round to two digits. */
export function formatPivotValue(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
    value,
  );
}
