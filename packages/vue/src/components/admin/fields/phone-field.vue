<script lang="ts">
import type { LooseRecord, SourceProp } from "@chelone/core";

/** Props for {@link PhoneField}. */
export interface PhoneFieldProps {
  source: SourceProp;
  record?: LooseRecord;
  defaultValue?: unknown;
  empty?: string;
  /** `national` → `(415) 555-2671`; `international` → `+1 415 555 2671`. */
  displayFormat?: "national" | "international";
  /** When false, renders a plain `<span>` instead of a `tel:` link. Default true. */
  link?: boolean;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<PhoneField>` — displays an E.164 phone number as a formatted label,
 * optionally wrapped in a `tel:` link, the Vue analog of `@chelone/react`'s
 * `fields/phone-field.tsx`. National/international formatting + the `tel:` URI
 * come from `libphonenumber-js` (the same dep the twin uses). An unparseable
 * value falls back to the raw string. A nullish/empty value renders the `empty`
 * fallback (or nothing).
 */

import { parsePhoneNumber } from "libphonenumber-js";
import { computed } from "vue";
import { useFieldValue } from "../../../record/use-field-value";
import { useTranslate } from "../../../i18n/use-translate";

// `withDefaults` for `link`: an absent Vue Boolean prop is cast to `false`, so
// the `true` default must live on the prop (a bare `?? true` never fires).
const props = withDefaults(defineProps<PhoneFieldProps>(), { link: true });

const displayFormat = computed(() => props.displayFormat ?? "national");

const value = useFieldValue({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const translate = useTranslate();

const raw = computed(() => {
  const v = value.value;
  if (v == null || v === "") return null;
  return String(v);
});

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);

/** { formatted label, tel href } — falling back to the raw string when unparseable. */
const parsed = computed(() => {
  const v = raw.value;
  if (v == null) return null;
  let formatted = v;
  let href = `tel:${v}`;
  try {
    const p = parsePhoneNumber(v);
    formatted =
      displayFormat.value === "international"
        ? p.formatInternational()
        : p.formatNational();
    href = p.getURI();
  } catch {
    // fall through: keep the raw value
  }
  return { formatted, href };
});
</script>

<template>
  <template v-if="parsed != null">
    <a
      v-if="link"
      data-slot="phone-field"
      :href="parsed.href"
      :class="props.class"
      >{{ parsed.formatted }}</a
    >
    <span v-else data-slot="phone-field" :class="props.class">{{
      parsed.formatted
    }}</span>
  </template>
  <span
    v-else-if="emptyText != null"
    data-slot="phone-field"
    :class="props.class"
    >{{ emptyText }}</span
  >
</template>
