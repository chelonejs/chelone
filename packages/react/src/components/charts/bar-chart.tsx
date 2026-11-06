import {
  hasChartValues,
  type LooseRecord,
  toCartesianRows,
} from "@chelone/core";
import {
  Bar,
  CartesianGrid,
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

export type BarChartProps<
  TRow extends object = LooseRecord,
  TX extends keyof TRow & string = keyof TRow & string,
> = SeriesChartProps<TRow, TX>;

export function BarChart<
  TRow extends object = LooseRecord,
  TX extends keyof TRow & string = keyof TRow & string,
>({
  data,
  xField,
  yField,
  title,
  color = "var(--primary)",
  height = 200,
  loading,
  bare,
  className,
}: BarChartProps<TRow, TX>) {
  const rows = toCartesianRows(data, xField, yField);
  const config: ChartConfig = { [yField]: { label: yField, color } };

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
          fill={color}
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
      </RechartsBarChart>
    </ChartFrame>
  );
}
