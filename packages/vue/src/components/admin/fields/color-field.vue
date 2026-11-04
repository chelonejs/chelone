<script lang="ts">
import type { LooseRecord, SourceProp } from "@chelone/core";

/** Props for {@link ColorField}. */
export interface ColorFieldProps {
  source: SourceProp;
  record?: LooseRecord;
  defaultValue?: unknown;
  empty?: string;
  /** When false, hides the textual color value next to the chip. Default true. */
  showLabel?: boolean;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<ColorField>` — displays a color value as a colored chip plus its string
 * label, the Vue analog of `@chelone/react`'s `fields/color-field.tsx`. Accepts
 * any CSS color string (hex, rgb, oklch); the chip's background rides the inline
 * `style` so the browser parses the value. A nullish/empty value renders the
 * `empty` fallback (or nothing).
 */

import { computed } from "vue";
import { useFieldValue } from "../../../record/use-field-value";
import { useTranslate } from "../../../i18n/use-translate";

// `withDefaults`: an absent Vue Boolean prop is cast to `false`, so `showLabel`
// needs its `true` default on the prop itself (a bare `?? true` never fires).
const props = withDefaults(defineProps<ColorFieldProps>(), { showLabel: true });

const value = useFieldValue({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const translate = useTranslate();

const color = computed(() => {
  const raw = value.value;
  if (raw == null || raw === "") return null;
  return String(raw);
});

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);
</script>

<template>
  <span
    v-if="color != null"
    data-slot="color-field"
    :class="['inline-flex items-center gap-2', props.class]"
  >
    <span
      data-color-chip
      class="inline-block h-4 w-4 rounded border border-border"
      :style="{ backgroundColor: color }"
      aria-hidden="true"
    />
    <span v-if="showLabel" class="font-mono text-sm">{{ color }}</span>
  </span>
  <span
    v-else-if="emptyText != null"
    data-slot="color-field"
    :class="props.class"
    >{{ emptyText }}</span
  >
</template>
