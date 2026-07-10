<script lang="ts">
import type { ChoiceInputBaseProps } from "./choice-input-props";

/** Props for {@link SelectInput}. */
export interface SelectInputProps extends ChoiceInputBaseProps {
  /** Label of the empty option prepended to the list. Default `""` (a blank line). */
  emptyText?: string;
  /** Underlying value submitted when the empty option is chosen. Default `""`. */
  emptyValue?: string | number | boolean | null;
}
</script>

<script setup lang="ts">
/**
 * `<SelectInput>` — a dropdown for choosing a single value, the Vue analog of
 * `@chelone/react`'s `inputs/select-input.tsx`. Reads choices from the ambient
 * {@link useChoicesContext} (inline `choices` prop, or a reference wrapper) via
 * {@link useChoiceInput}, binds the scalar with {@link useInput}, and renders a
 * native `<select>` (the dependency-free `ui/` idiom — the reka-ui Select popover
 * is adapted to a native control here, mirroring `native-select.vue`).
 *
 * Value-type fidelity (twin parity): the native `<select>` only speaks strings,
 * so on change the raw string is matched back to its original choice and the
 * choice's own value (a numeric id stays numeric) is submitted; the empty option
 * submits `emptyValue`.
 */

import { computed } from "vue";
import { useInput } from "../../../form/use-input";
import { useTranslate } from "../../../i18n/use-translate";
import { Field, FieldDescription, FieldError, FieldLabel } from "../../ui/field";
import ValidationError from "../common/validation-error.vue";
import { humanizeSource } from "./label-text";
import { useChoiceInput } from "./use-choice-input";

const props = withDefaults(defineProps<SelectInputProps>(), {
  label: undefined,
  emptyText: "",
  emptyValue: "",
  disableValue: "disabled",
});

const translate = useTranslate();

const {
  source,
  allChoices,
  fetchError,
  getChoiceText,
  getChoiceValue,
  getDisableValue,
} = useChoiceInput({
  componentName: "SelectInput",
  choices: props.choices,
  source: props.source,
  optionText: props.optionText,
  optionValue: props.optionValue,
  disableValue: props.disableValue,
  translateChoice: props.translateChoice,
});

const { id, value, setValue, blur, error, touched, isRequired } = useInput({
  source,
  defaultValue: props.defaultValue,
  validate: props.validate,
});

const invalid = computed(() => touched.value && error.value != null);
const stringValue = computed(() =>
  value.value != null ? String(value.value) : "",
);
const labelText = computed(() =>
  props.label === false ? null : (props.label ?? humanizeSource(source)),
);
const helper = computed(
  () => props.helperText ?? (fetchError.value as Error | undefined)?.message,
);
const emptyLabel = computed(() =>
  props.emptyText === "" ? " " : translate(props.emptyText, { _: props.emptyText }),
);

function onChange(event: Event) {
  const raw = (event.target as HTMLSelectElement).value;
  if (raw === String(props.emptyValue)) {
    setValue(props.emptyValue);
  } else {
    const choice = allChoices.value.find((c) => String(getChoiceValue(c)) === raw);
    setValue(choice ? getChoiceValue(choice) : raw);
  }
  blur();
}
</script>

<template>
  <Field :class="props.class" :data-invalid="invalid">
    <FieldLabel v-if="labelText != null" :html-for="id">
      {{ labelText }}<span v-if="isRequired"> *</span>
    </FieldLabel>
    <select
      :id="id"
      :value="stringValue || String(emptyValue)"
      :disabled="disabled || readonly"
      :aria-invalid="invalid || undefined"
      data-slot="select"
      class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
      @change="onChange"
    >
      <option :value="String(emptyValue)">{{ emptyLabel }}</option>
      <option
        v-for="choice in (fetchError ? [] : allChoices)"
        :key="String(getChoiceValue(choice))"
        :value="getChoiceValue(choice) != null ? String(getChoiceValue(choice)) : ''"
        :disabled="getDisableValue(choice) === true"
      >
        {{ getChoiceText(choice) }}
      </option>
    </select>
    <FieldDescription v-if="helper">{{ helper }}</FieldDescription>
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
