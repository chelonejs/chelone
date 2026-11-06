<script lang="ts">
import type { Component } from "vue";

/** Props for {@link MetricCard}. */
export interface MetricCardProps {
  label: string;
  value: number | string;
  /** A ratio: 0.05 is 5.0%. Nothing renders for `undefined` or a non-finite number. */
  delta?: number;
  /** Applies to a numeric `value` only. */
  format?: (value: number) => string;
  icon?: Component;
  loading?: boolean;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<MetricCard>`: a headline number with its change since the last period, the
 * Vue twin of `@chelone/react`'s `widgets/metric-card.tsx`. Needs no chart
 * library, so it ships in the base package. The label and the value render as
 * text interpolations, never as markup.
 */

import { getMetricDelta, type MetricDelta } from "@chelone/core";
import { computed } from "vue";
import { cn } from "../../../lib/utils";
import { Card } from "../../ui/card";
import Skeleton from "../../ui/skeleton.vue";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
} from "../list/list-icons";

const props = withDefaults(defineProps<MetricCardProps>(), {
  loading: false,
});

const ARROWS = {
  up: ArrowUpIcon,
  down: ArrowDownIcon,
  flat: ArrowRightIcon,
} satisfies Record<MetricDelta["direction"], Component>;

const DIRECTION_CLASS = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-destructive",
  flat: "text-muted-foreground",
} satisfies Record<MetricDelta["direction"], string>;

const change = computed(() => getMetricDelta(props.delta));
const shown = computed(() =>
  typeof props.value === "number" && props.format
    ? props.format(props.value)
    : props.value,
);
const cardClass = computed(() => cn("gap-2 px-6 py-6", props.class));
</script>

<template>
  <Card data-slot="metric-card" :class="cardClass">
    <template v-if="loading">
      <Skeleton class="h-4 w-24" />
      <Skeleton class="h-8 w-32" />
      <Skeleton class="h-4 w-16" />
    </template>
    <template v-else>
      <div class="flex items-center justify-between text-sm text-muted-foreground">
        <span>{{ label }}</span>
        <component :is="icon" v-if="icon" class="size-4" />
      </div>
      <div data-slot="metric-card-value" class="text-3xl font-semibold">
        {{ shown }}
      </div>
      <div
        v-if="change"
        data-slot="metric-card-delta"
        :data-direction="change.direction"
        :class="cn('flex items-center gap-1 text-sm', DIRECTION_CLASS[change.direction])"
      >
        <component :is="ARROWS[change.direction]" class="size-4" />
        <span>{{ change.text }}</span>
      </div>
    </template>
  </Card>
</template>
