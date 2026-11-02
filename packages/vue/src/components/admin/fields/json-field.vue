<script lang="ts">
import type { LooseRecord } from "@chelone/core";

/** Props for {@link JsonField}. */
export interface JsonFieldProps {
  source: string;
  record?: LooseRecord;
  defaultValue?: unknown;
  empty?: string;
  /** Spaces per indentation level. Defaults to 2. */
  indent?: number;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<JsonField>` — displays a record's JSON value as formatted text in a `<pre>`.
 * The Vue analog of `@chelone/react`'s `fields/json-field.tsx`. The value may be
 * an object, an array or a JSON string; a string that does not parse is shown
 * verbatim. A nullish value renders the translated `empty` string (or nothing).
 */

import { formatJsonValue } from "@chelone/core";
import { computed } from "vue";
import { cn } from "../../../lib/utils";
import { useFieldValue } from "../../../record/use-field-value";
import { useTranslate } from "../../../i18n/use-translate";

const props = withDefaults(defineProps<JsonFieldProps>(), { indent: 2 });

const value = useFieldValue({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const translate = useTranslate();

const text = computed(() =>
  value.value == null ? null : formatJsonValue(value.value, props.indent),
);

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);
</script>

<template>
  <pre
    v-if="text != null"
    data-slot="json-field"
    :class="cn('font-mono text-sm whitespace-pre-wrap', props.class)"
    >{{ text }}</pre
  >
  <span v-else-if="emptyText != null" :class="props.class">{{
    emptyText
  }}</span>
</template>
