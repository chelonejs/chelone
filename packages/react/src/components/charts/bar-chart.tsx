import {
  chartColor,
  DEFAULT_CHART_COLORS,
  hasChartValues,
  type LooseRecord,
  toCartesianRows,
} from "@chelone/core";
import {
  Bar,
  CartesianGrid,
  Cell,
  BarChart as RechartsBarChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ChartFrame, type SeriesChartProps } from "./chart-frame";

/**
 * The props of `<BarChart>`. Unlike the other series charts, `color` has no
 * default here: left out, each bar draws in the next theme chart color.
 */
export type BarChartProps<
  TRow extends object = LooseRecord,
  TX extends keyof TRow & string = keyof TRow & string,
> = SeriesChartProps<TRow, TX> & {
  /** Any CSS colors, cycled over the bars when `color` is left out. Defaults to the theme's chart colors. */
  colors?: readonly string[];
};

export function BarChart<
  TRow extends object = LooseRecord,
  TX extends keyof TRow & string = keyof TRow & string,
>({
  data,
  xField,
  yField,
  title,
  color,
  colors = DEFAULT_CHART_COLORS,
  height = 200,
  loading,
  bare,
  className,
}: BarChartProps<TRow, TX>) {
  // One color for every bar when `color` is given, otherwise the theme's chart
  // colors cycled per bar. Each row carries its own so the tooltip can name
  // the color of the bar it is describing.
  const colorOf = (index: number) => color ?? chartColor(index, colors);
  const rows = toCartesianRows(data, xField, yField).map((row, index) => ({
    ...row,
    fill: colorOf(index),
  }));
  // The config color is the one color a tooltip or legend can name. With a
  // color per bar there is no single one, so only the label goes in.
  const config: ChartConfig = {
    [yField]: { label: yField, ...(color === undefined ? {} : { color }) },
  };

  return (
    <ChartFrame
      slot="bar-chart"
      title={title}
      bare={bare}
      loading={loading}
      empty={!hasChartValues(rows)}
      height={height}
      config={config}
      className={className}
    >
      <RechartsBarChart data={rows}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="x" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width="auto" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="y"
          name={yField}
          fill={colorOf(0)}
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        >
          {rows.map((_row, index) => {
            const fill = colorOf(index);
            return (
              // The style is what paints: recharts hands `fill` to the path as
              // a presentation attribute, which an engine may drop when it
              // holds a var(), leaving its own default fill on screen.
              // biome-ignore lint/suspicious/noArrayIndexKey: a bar's color follows its position
              <Cell key={index} fill={fill} style={{ fill }} />
            );
          })}
        </Bar>
      </RechartsBarChart>
    </ChartFrame>
  );
}
