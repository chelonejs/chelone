import type { ReactElement } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslate } from "../../i18n-hooks";

export type ChartFrameProps = {
  /** The `data-slot` of the element that holds the chart, its skeleton or its empty text. */
  slot: string;
  title?: string;
  bare?: boolean;
  loading?: boolean;
  /** No number to draw: shows the empty text in place of the chart. */
  empty?: boolean;
  height: number;
  config: ChartConfig;
  className?: string;
  /** The recharts chart, drawn inside a `ChartContainer` of the given height. */
  children: ReactElement;
};

/** The props the charts that plot one field of a row against another share. */
export type SeriesChartProps<
  TRow extends object,
  TX extends keyof TRow & string,
> = {
  data: readonly TRow[];
  xField: TX;
  /** A row whose value is not a finite number draws no point. */
  yField: keyof TRow & string;
  title?: string;
  /** Any CSS color. Defaults to `var(--primary)`. */
  color?: string;
  /** In pixels. Defaults to 200. */
  height?: number;
  loading?: boolean;
  /** Leaves out the card and the title. */
  bare?: boolean;
  className?: string;
};

/** The shell the chart components share: a card with an optional title, or none when `bare`. */
export function ChartFrame({
  slot,
  title,
  bare = false,
  loading = false,
  empty = false,
  height,
  config,
  className,
  children,
}: ChartFrameProps) {
  const translate = useTranslate();

  let body: ReactElement = (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height }}
      initialDimension={{ width: 320, height }}
    >
      {children}
    </ChartContainer>
  );
  if (loading) {
    body = <Skeleton style={{ height }} />;
  } else if (empty) {
    body = (
      <div
        data-slot="chart-empty"
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        {translate("chelone.chart.empty", { _: "No data" })}
      </div>
    );
  }

  if (bare) {
    return (
      <div data-slot={slot} className={className}>
        {body}
      </div>
    );
  }

  return (
    <Card className={className}>
      {title ? (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent>
        <div data-slot={slot}>{body}</div>
      </CardContent>
    </Card>
  );
}
