import {
  hasChartValues,
  type LooseRecord,
  toCartesianRows,
} from "@chelone/core";
import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ChartFrame, type SeriesChartProps } from "./chart-frame";

export type TrendChartProps<
  TRow extends object = LooseRecord,
  TX extends keyof TRow & string = keyof TRow & string,
> = SeriesChartProps<TRow, TX> & {
  /** Fills the area under the line with a gradient. */
  area?: boolean;
  /** Draws a smooth curve instead of straight segments. */
  smooth?: boolean;
  xTickFormatter?: (value: TRow[TX]) => string;
  yTickFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number, name: string) => string;
};

export function TrendChart<
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
  area,
  smooth,
  bare,
  xTickFormatter,
  yTickFormatter,
  tooltipFormatter,
  className,
}: TrendChartProps<TRow, TX>) {
  const gradientId = `trend-${useId().replace(/:/g, "")}`;
  const rows = toCartesianRows(data, xField, yField);
  const config: ChartConfig = { [yField]: { label: yField, color } };
  const curve = smooth ? "monotone" : "linear";

  const axes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey="x"
        tickLine={false}
        axisLine={false}
        tickFormatter={xTickFormatter}
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        width="auto"
        tickFormatter={yTickFormatter}
      />
      <ChartTooltip
        content={
          <ChartTooltipContent
            formatter={
              tooltipFormatter
                ? (value, name) => (
                    <div className="flex flex-1 items-center justify-between gap-2 leading-none">
                      <span className="text-muted-foreground">{name}</span>
                      <span className="font-mono font-medium text-foreground tabular-nums">
                        {typeof value === "number"
                          ? tooltipFormatter(value, String(name))
                          : String(value)}
                      </span>
                    </div>
                  )
                : undefined
            }
          />
        }
      />
    </>
  );

  return (
    <ChartFrame
      slot="trend-chart"
      title={title}
      bare={bare}
      loading={loading}
      empty={!hasChartValues(rows)}
      height={height}
      config={config}
      className={className}
    >
      {area ? (
        <AreaChart data={rows}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          {axes}
          <Area
            dataKey="y"
            name={yField}
            type={curve}
            stroke={color}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      ) : (
        <LineChart data={rows}>
          {axes}
          <Line dataKey="y" name={yField} type={curve} stroke={color} />
        </LineChart>
      )}
    </ChartFrame>
  );
}
