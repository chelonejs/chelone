<script lang="ts">
/** Props for {@link PhoneInput}. */
export interface PhoneInputProps {
  source: SourceProp;
  label?: string | false;
  defaultValue?: string;
  validate?: Validator | readonly Validator[];
  defaultCountry?: CountryCode;
  allowedCountries?: readonly CountryCode[];
  disabled?: boolean;
  helperText?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<PhoneInput>` — stores E.164 (`+14155552671`) and renders a country selector
 * plus a national-format `tel` input, the Vue analog of `@chelone/react`'s
 * `inputs/phone-input.tsx`. National formatting + E.164 normalization come from
 * `libphonenumber-js` (the same dep the twin uses); `AsYouType` formats while
 * typing and `parsePhoneNumber(...).number` normalizes on write-back.
 */

import { type SourceProp, toTextValue, type Validator } from "@chelone/core";
import {
  AsYouType,
  type CountryCode,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumber,
} from "libphonenumber-js";
import { computed, ref, watch } from "vue";
import { useInput } from "../../../form/use-input";
import { cn } from "../../../lib/utils";
import { Field, FieldError, FieldLabel } from "../../ui/field";
import Input from "../../ui/input.vue";
import ValidationError from "../common/validation-error.vue";
import { targetOf } from "./event-target";
import { humanizeSource } from "./label-text";

const props = withDefaults(
  defineProps<PhoneInputProps>(),
  // `label: undefined` so an absent `string | false` label isn't coerced to
  // `false` by Vue's Boolean-prop rule (which would suppress the label).
  { defaultCountry: "US", label: undefined },
);

const { id, value, setValue, blur, error, touched, isRequired } = useInput({
  source: props.source,
  defaultValue: props.defaultValue,
  validate: props.validate,
});

function inferCountry(v: string, fallback: CountryCode): CountryCode {
  try {
    const p = parsePhoneNumber(v);
    if (p.country) return p.country;
  } catch {
    /* ignore */
  }
  return fallback;
}
function formatNational(v: string, country: CountryCode): string {
  try {
    return parsePhoneNumber(v, country).formatNational();
  } catch {
    return v;
  }
}

const stored = computed(() => toTextValue(value.value));
const countries = computed<readonly CountryCode[]>(
  () => props.allowedCountries ?? (getCountries()),
);

const country = ref<CountryCode>(inferCountry(stored.value, props.defaultCountry));
const display = ref<string>(formatNational(stored.value, country.value));

// Re-sync when the form value changes from OUTSIDE (record hydration / reset).
watch(stored, (next) => {
  const c = inferCountry(next, props.defaultCountry);
  country.value = c;
  display.value = formatNational(next, c);
});

const invalid = computed(() => touched.value && error.value != null);
const labelText = computed(() =>
  props.label === false ? null : (props.label ?? humanizeSource(props.source)),
);

function writeBack(nationalText: string, cc: CountryCode) {
  display.value = nationalText;
  try {
    setValue(parsePhoneNumber(nationalText, cc).number);
  } catch {
    setValue(nationalText);
  }
}
function onCountryChange(event: Event) {
  const select = targetOf(event, HTMLSelectElement);
  if (!select) return;
  const cc = countries.value.find((c) => c === select.value);
  if (!cc) {
    // A cleared select hands a value that is none of `countries`. Nothing is
    // written, and Vue will not re-patch `:value` because `country` never
    // changed, so put the select back to the country being formatted with.
    select.value = country.value;
    return;
  }
  country.value = cc;
  writeBack(display.value, cc);
}
function onTelInput(raw: string) {
  const formatted = new AsYouType(country.value).input(raw);
  writeBack(formatted, country.value);
}
</script>

<template>
  <Field :class="props.class" :data-invalid="invalid">
    <FieldLabel v-if="labelText != null" :html-for="id">
      {{ labelText }}<span v-if="isRequired"> *</span>
    </FieldLabel>
    <div :class="cn('flex items-center gap-2')">
      <select
        data-country-select
        aria-label="Country"
        :value="country"
        :disabled="disabled"
        class="h-9 rounded-md border border-input bg-background px-2 py-1 text-sm"
        @change="onCountryChange"
      >
        <option v-for="c in countries" :key="c" :value="c">
          {{ c }} +{{ getCountryCallingCode(c) }}
        </option>
      </select>
      <Input
        :id="id"
        type="tel"
        :model-value="display"
        :disabled="disabled"
        :aria-invalid="invalid"
        class="flex-1"
        @update:model-value="onTelInput"
        @blur="blur"
      />
    </div>
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
