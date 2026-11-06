import {
  chartColor,
  DEFAULT_CHART_COLORS,
  type LooseRecord,
  toDonutSlices,
} from "@chelone/core";
import { Cell, Pie, PieChart } from "recharts";
import {
  type ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ChartFrame } from "./chart-frame";

export type DonutChartProps<TRow extends object = LooseRecord> = {
  data: readonly TRow[];
  labelField: keyof TRow & string;
  /** A row whose value is not a number above zero draws no slice. */
  valueField: keyof TRow & string;
  title?: string;
  /** Any CSS colors, cycled over the slices. Defaults to the theme's chart colors. */
  colors?: readonly string[];
  /** In pixels. Defaults to 200. */
  height?: number;
  loading?: boolean;
  /** Leaves out the card and the title. */
  bare?: boolean;
  className?: string;
};

export function DonutChart<TRow extends object = LooseRecord>({
  data,
  labelField,
  valueField,
  title,
  colors = DEFAULT_CHART_COLORS,
  height = 200,
  loading,
  bare,
  className,
}: DonutChartProps<TRow>) {
  const slices = toDonutSlices(data, labelField, valueField);
  // Slice labels come from row data and ChartStyle writes config keys raw into a
  // <style>, so no label goes in the config. Slice colors are set on each Cell.
  const config: ChartConfig = {};

  return (
    <ChartFrame
      slot="donut-chart"
      title={title}
      bare={bare}
      loading={loading}
      empty={slices.length === 0}
      height={height}
      config={config}
      className={className}
    >
      <PieChart>
        <ChartTooltip
          content={<ChartTooltipContent nameKey="label" hideLabel />}
        />
        <Pie
          data={slices}
          dataKey="value"
          nameKey="label"
          innerRadius="60%"
          outerRadius="90%"
          stroke="none"
          isAnimationActive={false}
        >
          {slices.map((_slice, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: labels repeat, and a slice's color follows its position
            <Cell key={index} fill={chartColor(index, colors)} />
          ))}
        </Pie>
      </PieChart>
    </ChartFrame>
  );
}
