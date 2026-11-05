<script lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
import type { Component } from "vue";
import type { LooseRecord, SourceProp } from "@chelone/core";

/** Props for {@link RecordField}. */
export interface RecordFieldProps<RecordType extends LooseRecord = LooseRecord> {
  source?: SourceProp<RecordType>;
  /** Explicit label, or `false`/`""` to hide it. Absent → humanized `source`. */
  label?: string | false;
  /** Override the ambient resource (reserved for label i18n; inert in V1). */
  resource?: string;
  record?: RecordType;
  empty?: string;
  /** A field component to render (given `source` + `empty`) instead of TextField. */
  field?: Component;
  /** 'inline' lays the label + value in a row; 'default' stacks them. */
  variant?: "default" | "inline";
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
import type { VNode } from "vue";
/**
 * `<RecordField>` — displays a labeled field-value pair with flexible rendering,
 * the Vue analog of `@chelone/react`'s `fields/record-field.tsx`. Supports
 * vertical (`default`) or `inline` layout. Renders, in priority: the default
 * slot, then a `field` component, then a fallback `<TextField source>`. Used
 * inside a `RecordContext` (a `<Show>`, an `<ArrayField>` row).
 *
 * Idiom translation from the twin: React distinguishes `children` from a
 * `render: (record) => ReactNode` prop. Vue collapses both into ONE default
 * SCOPED SLOT — the slot receives `{ record }`, so a consumer either drops a
 * child field (`<RecordField source="price"><NumberField source="price"/></RecordField>`)
 * or computes derived text (`<RecordField v-slot="{ record }">{{ record.w }}x{{ record.h }}</RecordField>`).
 * The label uses the shared `humanizeSource` helper (the full resource-scoped
 * label i18n is a later wave — parity with the Vue inputs).
 */

import { computed, inject } from "vue";
import { cn } from "../../../lib/utils";
import { humanizeSource } from "../inputs/label-text";
import { RecordContextKey } from "../../../record/record-context";
import { useTranslate } from "../../../i18n/use-translate";
import TextField from "./text-field.vue";

// `label?: string | false` makes Vue infer a Boolean-typed prop, which absent
// would cast to `false` (Vue's boolean-prop default) and wrongly suppress the
// humanized-source fallback. An explicit `undefined` default opts out of the
// cast so an ABSENT label (→ humanize `source`) stays distinct from an EXPLICIT
// `label={false}` (→ hide), matching the React twin.
const props = withDefaults(defineProps<RecordFieldProps<RecordType>>(), {
  label: undefined,
});

const slots = defineSlots<{
  /** Receives the resolved record; renders children or derived content. */
  default?(props: { record: RecordType }): VNode[];
}>();

const translate = useTranslate();

const injectedRecord = inject(RecordContextKey, null);
const record = computed<RecordType | undefined>(
  () => (props.record ?? injectedRecord?.value) as RecordType | undefined,
);

const hasSlot = computed(() => slots.default != null);

/** Nothing to show at all → render nothing (parity with the twin's guard). */
const isBlank = computed(
  () => !props.source && !props.label && !hasSlot.value && !props.field,
);

const showLabel = computed(
  () => props.label !== "" && props.label !== false,
);

const labelText = computed(() => {
  if (!showLabel.value) return null;
  const raw =
    typeof props.label === "string"
      ? props.label
      : props.source
        ? humanizeSource(props.source)
        : null;
  return raw != null ? translate(raw, { _: raw }) : null;
});

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : props.empty,
);
</script>

<template>
  <div
    v-if="!isBlank"
    data-slot="record-field"
    :class="cn(props.class, 'flex', variant === 'inline' ? 'flex-row' : 'flex-col')"
  >
    <div
      v-if="labelText != null"
      :class="
        cn(
          variant === 'inline' ? 'block min-w-50' : 'text-xs',
          'text-muted-foreground',
        )
      "
    >
      {{ labelText }}
    </div>
    <span v-if="hasSlot && record" class="flex-1">
      <slot :record="record" />
    </span>
    <component
      :is="field"
      v-else-if="field"
      :source="source"
      :empty="empty"
      class="flex-1"
    />
    <TextField
      v-else-if="source"
      :source="source"
      :empty="emptyText"
      class="flex-1"
    />
  </div>
</template>
