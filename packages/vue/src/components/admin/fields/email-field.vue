<script lang="ts">
import type { LooseRecord } from "@chelone/core";

/** Props for {@link EmailField}. */
export interface EmailFieldProps {
  source: string;
  record?: LooseRecord;
  defaultValue?: unknown;
  empty?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<EmailField>` — displays an email address as a clickable `mailto:` link, the
 * Vue analog of `@chelone/react`'s `fields/email-field.tsx`. Reads the value at
 * `source` off the ambient record. The click is `.stop`-ped so the field is
 * safe inside a `DataTable` row with `rowClick`. A nullish value renders the
 * `empty` fallback (or nothing).
 */

import { computed } from "vue";
import { cn } from "../../../lib/utils";
import { useFieldValue } from "../../../record/use-field-value";
import { useTranslate } from "../../../i18n/use-translate";

const props = defineProps<EmailFieldProps>();

const value = useFieldValue({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const translate = useTranslate();

const email = computed(() => (value.value == null ? null : String(value.value)));
const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);
const linkClass = computed(() => cn("underline hover:no-underline", props.class));
</script>

<template>
  <a
    v-if="email != null"
    data-slot="email-field"
    :class="linkClass"
    :href="`mailto:${email}`"
    @click.stop
    >{{ email }}</a
  >
  <span
    v-else-if="emptyText != null"
    data-slot="email-field"
    :class="props.class"
    >{{ emptyText }}</span
  >
</template>
