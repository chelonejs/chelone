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
  const config: ChartConfig = {
    [valueField]: { label: valueField },
    ...Object.fromEntries(
      slices.map((slice, index) => [
        slice.label,
        { label: slice.label, color: chartColor(index, colors) },
      ]),
    ),
  };

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
          {slices.map((slice, index) => (
            <Cell key={slice.label} fill={chartColor(index, colors)} />
          ))}
        </Pie>
      </PieChart>
    </ChartFrame>
  );
}
