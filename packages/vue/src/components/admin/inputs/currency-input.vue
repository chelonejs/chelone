<script lang="ts">
/** Props for {@link CurrencyInput}. */
export interface CurrencyInputProps {
  source: string;
  label?: string | false;
  defaultValue?: unknown;
  validate?: Validator | readonly Validator[];
  /** ISO-4217 currency code when storage is a plain number. */
  currency?: string;
  /** Provide to enable currency selection; stores composite { amount, currency }. */
  currencies?: readonly string[];
  /** Override the app locale for formatting the symbol/step. */
  displayLocale?: string;
  /** Multiply displayed major units by 100 on write so storage is integer cents. */
  storeAsMinorUnits?: boolean;
  disabled?: boolean;
  helperText?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<CurrencyInput>` — locale-aware money input, the Vue analog of
 * `@chelone/react`'s `inputs/currency-input.tsx`. Stores either a plain `number`
 * (single-currency mode) or a composite `{ amount, currency }` (multi-currency
 * mode, enabled by `currencies`). The symbol + step precision are formatted with
 * `displayLocale`, falling back to the ambient i18n locale. A focused-buffer
 * keeps the display string stable while typing.
 */

import type { Validator } from "@chelone/core";
import { computed, ref, watch } from "vue";
import { useCheloneContext } from "../../../context";
import { useInput } from "../../../form/use-input";
import { cn } from "../../../lib/utils";
import { Field, FieldError, FieldLabel } from "../../ui/field";
import Input from "../../ui/input.vue";
import ValidationError from "../common/validation-error.vue";
import { humanizeSource } from "./label-text";

interface Composite {
  amount: number;
  currency: string;
}

const props = withDefaults(
  defineProps<CurrencyInputProps>(),
  // `label: undefined` so an absent `string | false` label isn't coerced to
  // `false` by Vue's Boolean-prop rule (which would suppress the label).
  { storeAsMinorUnits: false, label: undefined },
);

const { i18n } = useCheloneContext();
const locale = computed(
  () => props.displayLocale ?? i18n?.getLocale() ?? "en",
);

const { id, value, setValue, blur, error, touched, isRequired } = useInput({
  source: props.source,
  defaultValue: props.defaultValue,
  validate: props.validate,
});

const isComposite = computed(() => props.currencies != null);
const composite = computed<Composite | null>(() =>
  isComposite.value ? (value.value as Composite | null) : null,
);
const fixedAmount = computed<number | null>(() =>
  isComposite.value
    ? (composite.value?.amount ?? null)
    : ((value.value as number | null) ?? null),
);
const currentCurrency = computed<string | undefined>(() =>
  isComposite.value ? composite.value?.currency : props.currency,
);

const majorAmount = computed<number | "">(() => {
  const a = fixedAmount.value;
  if (a == null) return "";
  return props.storeAsMinorUnits ? a / 100 : a;
});

const displayValue = ref<string>(String(majorAmount.value));
const focused = ref(false);
watch(majorAmount, (next) => {
  if (!focused.value) displayValue.value = String(next);
});

const invalid = computed(() => touched.value && error.value != null);
const labelText = computed(() =>
  props.label === false ? null : (props.label ?? humanizeSource(props.source)),
);

const currencySymbol = computed(() =>
  currentCurrency.value
    ? new Intl.NumberFormat(locale.value, {
        style: "currency",
        currency: currentCurrency.value,
      })
        .formatToParts(0)
        .find((p) => p.type === "currency")?.value
    : "",
);

function onAmountInput(raw: string) {
  displayValue.value = raw;
  const parsed = raw === "" ? Number.NaN : Number(raw);
  const next = Number.isNaN(parsed)
    ? null
    : props.storeAsMinorUnits
      ? Math.round(parsed * 100)
      : parsed;
  if (isComposite.value) {
    setValue({
      amount: next ?? 0,
      currency: currentCurrency.value ?? props.currencies?.[0],
    });
  } else {
    setValue(next);
  }
}
function onCurrencyChange(event: Event) {
  if (!isComposite.value) return;
  setValue({
    amount: composite.value?.amount ?? 0,
    currency: (event.target as HTMLSelectElement).value,
  });
}
function onBlur() {
  focused.value = false;
  blur();
}
</script>

<template>
  <Field :class="props.class" :data-invalid="invalid">
    <FieldLabel v-if="labelText != null" :html-for="id">
      {{ labelText }}<span v-if="isRequired"> *</span>
    </FieldLabel>
    <div :class="cn('flex items-center gap-2')">
      <span class="w-6 text-right text-muted-foreground text-sm">{{ currencySymbol }}</span>
      <Input
        :id="id"
        type="number"
        :model-value="displayValue"
        :disabled="disabled"
        :aria-invalid="invalid"
        @focus="focused = true"
        @update:model-value="onAmountInput"
        @blur="onBlur"
      />
      <select
        v-if="isComposite"
        data-currency-select
        :value="currentCurrency ?? props.currencies?.[0]"
        :disabled="disabled"
        class="rounded-md border border-input bg-background px-2 py-1 text-sm"
        @change="onCurrencyChange"
      >
        <option v-for="c in props.currencies" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
