import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  className?: string;
  children: ReactNode;
};

/** The shell the chart components share: a card with an optional title, or none when `bare`. */
export function ChartFrame({
  slot,
  title,
  bare = false,
  loading = false,
  empty = false,
  height,
  className,
  children,
}: ChartFrameProps) {
  const translate = useTranslate();

  let body = children;
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
