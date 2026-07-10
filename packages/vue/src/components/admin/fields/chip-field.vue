<script lang="ts">
import type { LooseRecord } from "@chelone/core";
import type { BadgeVariant } from "../../ui/badge";

/** Props for {@link ChipField}. */
export interface ChipFieldProps {
  source: string;
  record?: LooseRecord;
  defaultValue?: unknown;
  empty?: string;
  /** Badge variant. Default `outline` (parity with the React twin). */
  variant?: BadgeVariant;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<ChipField>` — displays a value inside a styled `<Badge>` (a Material-UI-Chip
 * analog), the Vue port of `@chelone/react`'s `fields/chip-field.tsx`. Reads the
 * value at `source` off the ambient record. Defaults to the `outline` variant.
 * A nullish/empty value renders the `empty` fallback in muted text (or nothing).
 */

import { computed } from "vue";
import { cn } from "../../../lib/utils";
import { Badge } from "../../ui/badge";
import { useFieldValue } from "../../../record/use-field-value";
import { useTranslate } from "../../../i18n/use-translate";

const props = defineProps<ChipFieldProps>();

const variant = computed(() => props.variant ?? "outline");

const value = useFieldValue({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const translate = useTranslate();

const text = computed(() => {
  const raw = value.value;
  if (raw == null || raw === "") return null;
  return typeof raw === "string" ? raw : String(raw);
});

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);
</script>

<template>
  <Badge v-if="text != null" :variant="variant" :class="props.class">{{
    text
  }}</Badge>
  <span
    v-else-if="emptyText != null"
    data-slot="chip-field"
    :class="cn('text-muted-foreground', props.class)"
    >{{ emptyText }}</span
  >
</template>
