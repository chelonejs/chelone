<script lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
import type { LooseRecord, ResourceRecord, SourceProp, SourceValue } from "@chelone/core";

/** Props for {@link CurrencyField}. */
export interface CurrencyFieldProps<RecordType extends ResourceRecord = LooseRecord> {
  source: SourceProp<RecordType>;
  record?: RecordType;
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  empty?: string;
  /** ISO-4217 currency code (e.g. 'USD'). Required when value is a plain number. */
  currency?: string;
  /** BCP 47 locale for `Intl.NumberFormat`. */
  displayLocale?: string;
  /** Treat the stored value as minor units (cents) and divide by 100. */
  storeAsMinorUnits?: boolean;
  /** Extra options forwarded to `Intl.NumberFormat`. */
  options?: Intl.NumberFormatOptions;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
/**
 * `<CurrencyField>` — displays a monetary value via `Intl.NumberFormat`, the Vue
 * analog of `@chelone/react`'s `fields/currency-field.tsx`. Accepts either a
 * plain `number` (with the `currency` prop) or a composite
 * `{ amount, currency }` object. `storeAsMinorUnits` divides by 100 (cents →
 * dollars) before formatting. A nullish value renders the `empty` fallback (or
 * nothing).
 *
 * Idiom translation from the twin: the React field resolves the app locale via
 * `useLocale()`; here `useLocale()` is a ref, so the field formats with
 * `displayLocale ?? appLocale` and re-formats on `i18n.setLocale`.
 */

import { computed } from "vue";
import { useFieldValue } from "../../../record/use-field-value";
import { useLocale } from "../../../i18n/use-locale";
import { useTranslate } from "../../../i18n/use-translate";

const props = defineProps<CurrencyFieldProps<RecordType>>();

const value = useFieldValue<RecordType>({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const translate = useTranslate();
const appLocale = useLocale();

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);

/** Normalize a number-or-`{amount,currency}` value to `{ amount, code }`. */
function normalize(v: unknown): { amount: number; code: string } {
  if (
    typeof v === "object" &&
    v !== null &&
    "amount" in v &&
    (typeof v.amount === "number" || typeof v.amount === "string") &&
    "currency" in v &&
    typeof v.currency === "string"
  ) {
    // A numeric column serialised as a string is still a valid amount.
    return { amount: Number(v.amount), code: v.currency };
  }
  if (!props.currency) {
    throw new Error("<CurrencyField>: numeric value requires a `currency` prop");
  }
  return { amount: Number(v), code: props.currency };
}

const formatted = computed<string | null>(() => {
  const raw = value.value;
  if (raw == null) return null;
  const { amount, code } = normalize(raw);
  const major = props.storeAsMinorUnits ? amount / 100 : amount;
  return new Intl.NumberFormat(props.displayLocale ?? appLocale.value, {
    style: "currency",
    currency: code,
    ...props.options,
  }).format(major);
});
</script>

<template>
  <span
    v-if="formatted != null"
    data-slot="currency-field"
    :class="props.class"
    >{{ formatted }}</span
  >
  <span
    v-else-if="emptyText != null"
    data-slot="currency-field"
    :class="props.class"
    >{{ emptyText }}</span
  >
</template>
