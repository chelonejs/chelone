/**
 * What the charts that plot one field of a row against another share: their
 * props, and the rows, tooltip config and x axis labels drawn from them.
 */

import { type LooseRecord, toCartesianRows } from "@chelone/core";
import { computed } from "vue";
import {
  type ChartConfig,
  ChartTooltipContent,
  componentToString,
} from "../ui/chart";

/** The props `<TrendChart>` and `<BarChart>` share. */
export interface SeriesChartProps<
  TRow extends object = LooseRecord,
  TX extends keyof TRow & string = keyof TRow & string,
> {
  data: readonly TRow[];
  xField: TX;
  /** A row whose value is not a finite number draws no point or bar. */
  yField: keyof TRow & string;
  title?: string;
  /** Any CSS color. Defaults to `var(--primary)`. */
  color?: string;
  /** In pixels. Defaults to 200. */
  height?: number;
  loading?: boolean;
  /** Leaves out the card and the title. */
  bare?: boolean;
  class?: string;
}

type Point = { index: number; y: number | null };

/** x is the row index, so any x value keeps its order. */
export const rowX = (row: Point) => row.index;
export const rowY = (row: Point) => row.y;

/** What `useSeriesRows` reads: the shared props, and `<TrendChart>`'s x tick formatter. */
type SeriesSource<
  TRow extends object,
  TX extends keyof TRow & string,
> = SeriesChartProps<TRow, TX> & {
  xTickFormatter?: (value: TRow[TX]) => string;
};

export function useSeriesRows<
  TRow extends object,
  TX extends keyof TRow & string,
>(props: SeriesSource<TRow, TX>) {
  const rows = computed(() =>
    toCartesianRows(props.data, props.xField, props.yField),
  );
  type Row = (typeof rows.value)[number];

  const config = computed<ChartConfig>(() => ({
    [props.yField]: { label: props.yField, color: props.color },
  }));

  /** The label of the row an axis tick or the crosshair stands on; between two rows there is none. */
  function xLabel(position: number | Date) {
    const index = typeof position === "number" ? position : position.getTime();
    const row = Number.isInteger(index) ? rows.value[index] : undefined;
    if (!row) return "";
    if (props.xTickFormatter) return props.xTickFormatter(row.x);
    return row.x == null ? "" : String(row.x);
  }

  // Few enough rows to name each one; otherwise every step-th row.
  const xTicks = computed(() => {
    const step = Math.max(1, Math.ceil(rows.value.length / 7));
    return rows.value.filter((row) => row.index % step === 0).map(rowX);
  });

  /**
   * The crosshair's HTML for a row, with `value` shown in place of the row's y.
   * `color` draws the row's own indicator, for a chart whose color is not the
   * same for every row.
   */
  const tooltipFor = (
    row: Row,
    value: number | string | null,
    color?: string,
  ) =>
    componentToString(config.value, ChartTooltipContent, {
      labelFormatter: xLabel,
      ...(color === undefined ? {} : { color }),
    })?.({ [props.yField]: value }, row.index) ?? "";

  /** The props of the x `<VisAxis>`: each tick names its row. */
  const xAxis = computed(() => ({
    gridLine: false,
    tickLine: false,
    domainLine: false,
    tickValues: xTicks.value,
    tickFormat: xLabel,
  }));

  return { rows, config, xAxis, tooltipFor };
}
