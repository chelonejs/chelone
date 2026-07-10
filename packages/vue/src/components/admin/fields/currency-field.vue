<script lang="ts">
import type { LooseRecord } from "@chelone/core";

/** Props for {@link CurrencyField}. */
export interface CurrencyFieldProps {
  source: string;
  record?: LooseRecord;
  defaultValue?: unknown;
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

<script setup lang="ts">
/**
 * `<CurrencyField>` — displays a monetary value via `Intl.NumberFormat`, the Vue
 * analog of `@chelone/react`'s `fields/currency-field.tsx`. Accepts either a
 * plain `number` (with the `currency` prop) or a composite
 * `{ amount, currency }` object. `storeAsMinorUnits` divides by 100 (cents →
 * dollars) before formatting. A nullish value renders the `empty` fallback (or
 * nothing).
 *
 * Idiom translation from the twin: the React field resolves the app locale via
 * `useLocale()` (`displayLocale ?? appLocale`). The Vue package ships no
 * `useLocale` composable (no i18n-provider locale surface yet), so the locale
 * comes from the `displayLocale` prop only, defaulting to the host's locale —
 * matching the `locales` convention of `<NumberField>` / `<DateField>`.
 */

import { computed } from "vue";
import { useFieldValue } from "../../../record/use-field-value";
import { useTranslate } from "../../../i18n/use-translate";

const props = defineProps<CurrencyFieldProps>();

const value = useFieldValue({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const translate = useTranslate();

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);

/** Normalize a number-or-`{amount,currency}` value to `{ amount, code }`. */
function normalize(v: unknown): { amount: number; code: string } {
  if (typeof v === "object" && v !== null && "amount" in v && "currency" in v) {
    const obj = v as { amount: number; currency: string };
    return { amount: obj.amount, code: obj.currency };
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
  return new Intl.NumberFormat(props.displayLocale, {
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
