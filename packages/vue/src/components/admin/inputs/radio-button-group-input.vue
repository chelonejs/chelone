<script lang="ts" generic="TChoice extends ChoiceRecord = ChoiceRecord">
import type { LooseRecord, SourceProp } from "@chelone/core";
import type { ChoiceRecord } from "../../../choices/use-choices";
import type { ChoiceInputBaseProps } from "./choice-input-props";

/** Props for {@link RadioButtonGroupInput}. */
export interface RadioButtonGroupInputProps<
  TChoice extends ChoiceRecord = ChoiceRecord,
> extends ChoiceInputBaseProps<LooseRecord, SourceProp, TChoice> {
  /** Lay the radios out horizontally instead of stacked. */
  row?: boolean;
}
</script>

<script setup lang="ts" generic="TChoice extends ChoiceRecord = ChoiceRecord">
/**
 * `<RadioButtonGroupInput>` — a single-select rendered as a list of radios, the
 * Vue analog of `@chelone/react`'s `inputs/radio-button-group-input.tsx`. Reads
 * choices via {@link useChoiceInput}, binds the scalar with {@link useInput}, and
 * renders native `<input type=radio>` controls inside a `<fieldset>` (the
 * dependency-free `ui/` idiom — reka-ui RadioGroup adapted to native radios; the
 * shared `name` gives them single-select semantics).
 *
 * Value-type fidelity (twin parity): radios only speak strings, so the checked
 * comparison stringifies both sides and the ORIGINAL choice value (a numeric id
 * stays numeric) is submitted on change.
 */

import { computed } from "vue";
import { useInput } from "../../../form/use-input";
import { FieldDescription, FieldError, FieldLabel } from "../../ui/field";
import ValidationError from "../common/validation-error.vue";
import { humanizeSource } from "./label-text";
import { useChoiceInput } from "./use-choice-input";

const props = withDefaults(defineProps<RadioButtonGroupInputProps<TChoice>>(), {
  label: undefined,
  row: false,
});

const {
  source,
  allChoices,
  fetchError,
  getChoiceText,
  getChoiceValue,
  getDisableValue,
} = useChoiceInput({
  componentName: "RadioButtonGroupInput",
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
  () => props.helperText ?? fetchError.value?.message,
);

function isChoiceDisabled(choice: TChoice): boolean {
  return (
    props.disabled === true ||
    props.readonly === true ||
    getDisableValue(choice) === true
  );
}

function onSelect(choice: TChoice) {
  setValue(getChoiceValue(choice));
  blur();
}
</script>

<template>
  <fieldset
    :class="props.class"
    :data-invalid="invalid || undefined"
    data-slot="radio-button-group"
    class="flex flex-col gap-2"
  >
    <legend v-if="labelText != null" class="text-sm font-medium leading-none">
      {{ labelText }}<span v-if="isRequired"> *</span>
    </legend>
    <div :class="['flex', row ? 'flex-row gap-4' : 'flex-col gap-2']" role="radiogroup">
      <div
        v-for="choice in allChoices"
        :key="String(getChoiceValue(choice))"
        class="flex items-center gap-2"
        :data-disabled="isChoiceDisabled(choice) || undefined"
      >
        <input
          :id="`${id}-${String(getChoiceValue(choice))}`"
          type="radio"
          :name="id"
          :value="String(getChoiceValue(choice))"
          :checked="stringValue === String(getChoiceValue(choice))"
          :disabled="isChoiceDisabled(choice)"
          class="h-4 w-4"
          @change="onSelect(choice)"
        />
        <FieldLabel
          :html-for="`${id}-${String(getChoiceValue(choice))}`"
          class="font-normal"
        >
          {{ getChoiceText(choice) }}
        </FieldLabel>
      </div>
    </div>
    <FieldDescription v-if="helper">{{ helper }}</FieldDescription>
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </fieldset>
</template>
