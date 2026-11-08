<script lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
import type { LooseRecord, ResourceRecord, SourceProp, SourceValue } from "@chelone/core";

/** Props for {@link BooleanField}. */
export interface BooleanFieldProps<RecordType extends ResourceRecord = LooseRecord> {
  source: SourceProp<RecordType>;
  record?: RecordType;
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  /** Label shown (as a native `title` tooltip) when the value is truthy. */
  valueLabelTrue?: string;
  /** Label shown (as a native `title` tooltip) when the value is falsy. */
  valueLabelFalse?: string;
  /** When true, coerce any truthy value (not just `true`) to the check icon. */
  looseValue?: boolean;
  empty?: string;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
/**
 * `<BooleanField>` — displays a boolean value as a colored check (truthy) or
 * close (falsy) icon, the Vue analog of `@chelone/react`'s
 * `fields/boolean-field.tsx`. Reads the value at `source` off the ambient
 * record via `useFieldValue`.
 *
 * Idiom translation from the React twin: the React field wraps the icon in a
 * reka/radix `<Tooltip>` surfacing the true/false label. The Vue `ui/` slice
 * carries no tooltip primitive (deferred wave), so the label rides on the
 * icon's native `title` attribute — same information, hover-revealed, AT-read,
 * zero new dep. Custom `TrueIcon`/`FalseIcon` component props (a React-only
 * ergonomic) are dropped in favor of the built-in inline check/x SVGs; a
 * consumer needing bespoke glyphs styles via `class`.
 *
 * A non-boolean value (with `looseValue` off) renders the `empty` fallback (or
 * nothing), matching the twin.
 */

import { computed } from "vue";
import { cn } from "../../../lib/utils";
import { useFieldValue } from "../../../record/use-field-value";
import { useTranslate } from "../../../i18n/use-translate";

const props = defineProps<BooleanFieldProps<RecordType>>();

const value = useFieldValue<RecordType>({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const translate = useTranslate();

/** Render an icon (looseValue OR a real boolean); otherwise fall through to empty. */
const renderIcon = computed(
  () => props.looseValue || typeof value.value === "boolean",
);

const isTruthy = computed(
  () => value.value === true || (props.looseValue === true && !!value.value),
);

const label = computed(() => {
  const explicit = isTruthy.value
    ? props.valueLabelTrue
    : props.valueLabelFalse;
  const key = explicit ?? (isTruthy.value ? "chelone.boolean.true" : "chelone.boolean.false");
  return translate(key, { _: key });
});

const iconClass = computed(() => cn("size-5 text-foreground", props.class));
</script>

<template>
  <template v-if="renderIcon">
    <svg
      v-if="isTruthy"
      data-slot="boolean-field"
      data-value="true"
      :class="iconClass"
      :title="label"
      role="img"
      :aria-label="label"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
    <svg
      v-else
      data-slot="boolean-field"
      data-value="false"
      :class="iconClass"
      :title="label"
      role="img"
      :aria-label="label"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  </template>
  <span v-else-if="empty" data-slot="boolean-field">{{ empty }}</span>
</template>
