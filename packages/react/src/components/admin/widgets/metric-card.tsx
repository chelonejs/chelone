/**
 * `<MetricCard>`: a headline number with its change since the last period.
 * Needs no chart library, so it ships in the base package. The label and the
 * value render as text nodes, never as markup.
 */

import { getMetricDelta, type MetricDelta } from "@chelone/core";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import type { ComponentType } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type MetricCardProps = {
  label: string;
  value: number | string;
  /** A ratio: 0.05 is 5.0%. Nothing renders for `undefined` or a non-finite number. */
  delta?: number;
  /** Applies to a numeric `value` only. */
  format?: (value: number) => string;
  icon?: ComponentType<{ className?: string }>;
  loading?: boolean;
  className?: string;
};

const ARROWS = {
  up: ArrowUp,
  down: ArrowDown,
  flat: ArrowRight,
} satisfies Record<
  MetricDelta["direction"],
  ComponentType<{ className?: string }>
>;

const DIRECTION_CLASS = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-destructive",
  flat: "text-muted-foreground",
} satisfies Record<MetricDelta["direction"], string>;

export function MetricCard({
  label,
  value,
  delta,
  format,
  icon: Icon,
  loading = false,
  className,
}: MetricCardProps) {
  if (loading) {
    return (
      <Card data-slot="metric-card" className={cn("gap-2 px-6", className)}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-16" />
      </Card>
    );
  }

  const change = getMetricDelta(delta);
  const Arrow = change ? ARROWS[change.direction] : null;

  return (
    <Card data-slot="metric-card" className={cn("gap-2 px-6", className)}>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        {Icon ? <Icon className="size-4" /> : null}
      </div>
      <div data-slot="metric-card-value" className="text-3xl font-semibold">
        {typeof value === "number" && format ? format(value) : value}
      </div>
      {change && Arrow ? (
        <div
          data-slot="metric-card-delta"
          data-direction={change.direction}
          className={cn(
            "flex items-center gap-1 text-sm",
            DIRECTION_CLASS[change.direction],
          )}
        >
          <Arrow className="size-4" aria-hidden="true" />
          <span>{change.text}</span>
        </div>
      ) : null}
    </Card>
  );
}
