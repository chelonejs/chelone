/** Theme variables the registry ships, in series order. */
export const DEFAULT_CHART_COLORS: readonly string[] = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function chartColor(
  index: number,
  colors: readonly string[] = DEFAULT_CHART_COLORS,
): string {
  const length = colors.length;
  return colors[((index % length) + length) % length] as string;
}

export type CartesianRow = { index: number; x: unknown; y: number | null };

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function toCartesianRows(
  data: readonly Record<string, unknown>[],
  xField: string,
  yField: string,
): CartesianRow[] {
  return data.map((row, index) => ({
    index,
    x: row[xField],
    y: toFiniteNumber(row[yField]),
  }));
}

export function hasChartValues(rows: readonly CartesianRow[]): boolean {
  return rows.some((row) => row.y !== null);
}

export type DonutSlice = { label: string; value: number; share: number };

export function toDonutSlices(
  data: readonly Record<string, unknown>[],
  labelField: string,
  valueField: string,
): DonutSlice[] {
  const kept: { label: string; value: number }[] = [];
  for (const row of data) {
    const value = toFiniteNumber(row[valueField]);
    if (value !== null && value > 0) {
      kept.push({ label: String(row[labelField]), value });
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
