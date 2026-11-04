<script setup lang="ts">
/**
 * `<ChartTooltipContent>` — the tooltip body for a hovered datum. `payload` is
 * the datum (key to value); each key that has a config entry becomes a row
 * with its indicator, label and value. Rendered by `componentToString` for
 * unovis, so everything shown goes through Vue's escaping. The Vue analog of
 * shadcn-vue's `ChartTooltipContent`.
 */

import { computed } from "vue";
import { cn } from "../../../lib/utils";
import { useChart } from "./utils";

const props = withDefaults(
  defineProps<{
    class?: string;
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    /** Payload key whose value names each row; defaults to the key itself. */
    nameKey?: string;
    /** Payload key shown as the heading in place of `x`. */
    labelKey?: string;
    labelFormatter?: (x: number | Date) => string | number;
    payload?: Record<string, unknown>;
    color?: string;
    /** The hovered x value, passed by `componentToString`. */
    x?: number | Date;
  }>(),
  { indicator: "dot", payload: () => ({}) },
);

const { config } = useChart();

const label = computed(() => {
  if (props.hideLabel) return null;
  if (props.labelKey && props.payload[props.labelKey] != null) {
    return String(props.payload[props.labelKey]);
  }
  if (props.x === undefined) return null;
  if (props.labelFormatter) return String(props.labelFormatter(props.x));
  return props.x instanceof Date ? props.x.toISOString() : String(props.x);
});

const rows = computed(() =>
  Object.entries(props.payload)
    .filter(([key]) => Object.hasOwn(config.value, key) && key !== props.labelKey)
    .map(([key, value]) => {
      const item = config.value[key];
      const named = props.nameKey ? props.payload[props.nameKey] : undefined;
      return {
        key,
        item,
        name: item?.label ?? (named != null ? String(named) : key),
        value:
          value == null
            ? null
            : typeof value === "number"
              ? value.toLocaleString()
              : String(value),
        color: props.color ?? item?.color ?? `var(--color-${key})`,
      };
    }),
);

const nestLabel = computed(
  () => rows.value.length === 1 && props.indicator !== "dot",
);
</script>

<template>
  <div
    :class="
      cn(
        'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
        props.class,
      )
    "
  >
    <div v-if="label && !nestLabel" class="font-medium">{{ label }}</div>
    <div class="grid gap-1.5">
      <div
        v-for="row in rows"
        :key="row.key"
        :class="
          cn(
            'flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground',
            props.indicator === 'dot' && 'items-center',
          )
        "
      >
        <component :is="row.item?.icon" v-if="row.item?.icon" />
        <div
          v-else-if="!props.hideIndicator"
          :class="
            cn(
              'shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)',
              props.indicator === 'dot' && 'h-2.5 w-2.5',
              props.indicator === 'line' && 'w-1',
              props.indicator === 'dashed' &&
                'w-0 border-[1.5px] border-dashed bg-transparent',
              nestLabel && props.indicator === 'dashed' && 'my-0.5',
            )
          "
          :style="{ '--color-bg': row.color, '--color-border': row.color }"
        />
        <div
          :class="
            cn(
              'flex flex-1 justify-between leading-none',
              nestLabel ? 'items-end' : 'items-center',
            )
          "
        >
          <div class="grid gap-1.5">
            <div v-if="nestLabel && label" class="font-medium">{{ label }}</div>
            <span class="text-muted-foreground">
              <component :is="row.name" v-if="typeof row.name !== 'string'" />
              <template v-else>{{ row.name }}</template>
            </span>
          </div>
          <span
            v-if="row.value !== null"
            class="font-mono font-medium text-foreground tabular-nums"
            >{{ row.value }}</span
          >
        </div>
      </div>
    </div>
  </div>
</template>
