/** Theme variables the registry ships, in series order. */
export const DEFAULT_CHART_COLORS: readonly string[] = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const FALLBACK_COLOR = "var(--chart-1)";

export function chartColor(
  index: number,
  colors: readonly string[] = DEFAULT_CHART_COLORS,
): string {
  const list = colors.length > 0 ? colors : DEFAULT_CHART_COLORS;
  const length = list.length;
  return list[((index % length) + length) % length] ?? FALLBACK_COLOR;
}

/** One point of a series: `x` is the row's value as given, `y` a finite number or a `null` gap. */
export type CartesianRow<TX> = { index: number; x: TX; y: number | null };

function toFiniteNumber<TValue>(value: TValue): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function toCartesianRows<
  TRow extends object,
  TX extends keyof TRow & string,
  TY extends keyof TRow & string,
>(data: readonly TRow[], xField: TX, yField: TY): CartesianRow<TRow[TX]>[] {
  return data.map((row, index) => ({
    index,
    x: row[xField],
    y: toFiniteNumber(row[yField]),
  }));
}

export function hasChartValues(rows: readonly { y: number | null }[]): boolean {
  return rows.some((row) => row.y !== null);
}

function toLabel<TValue>(value: TValue): string {
  return value === undefined || value === null ? "" : String(value);
}

export type DonutSlice = { label: string; value: number; share: number };

export function toDonutSlices<
  TRow extends object,
  TLabel extends keyof TRow & string,
  TValue extends keyof TRow & string,
>(data: readonly TRow[], labelField: TLabel, valueField: TValue): DonutSlice[] {
  const kept: { label: string; value: number }[] = [];
  for (const row of data) {
    const value = toFiniteNumber(row[valueField]);
    if (value !== null && value > 0) {
      kept.push({ label: toLabel(row[labelField]), value });
    }
  }
  const total = kept.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) return [];
  return kept.map((slice) => ({ ...slice, share: slice.value / total }));
}

export type MetricDelta = { direction: "up" | "down" | "flat"; text: string };

/** `delta` is a ratio (0.05 is 5.0%). Direction follows the sign of `delta`, not of the rounded text. */
export function getMetricDelta(delta: number | undefined): MetricDelta | null {
  if (delta === undefined || !Number.isFinite(delta)) return null;
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return { direction, text: `${(delta * 100).toFixed(1)}%` };
}
