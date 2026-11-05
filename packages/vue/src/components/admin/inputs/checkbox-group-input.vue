<script lang="ts" generic="TChoice extends ChoiceRecord = ChoiceRecord">
import type { LooseRecord, SourceProp } from "@chelone/core";
import type { ChoiceRecord } from "../../../choices/use-choices";
import type { ChoiceInputBaseProps } from "./choice-input-props";

/** Props for {@link CheckboxGroupInput}. */
export interface CheckboxGroupInputProps<
  TRecord = LooseRecord,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
  TChoice extends ChoiceRecord = ChoiceRecord,
> extends ChoiceInputBaseProps<TRecord, TPath, TChoice> {
  /** Lay the checkboxes out horizontally instead of stacked. */
  row?: boolean;
}
</script>

<script setup lang="ts" generic="TChoice extends ChoiceRecord = ChoiceRecord">
/**
 * `<CheckboxGroupInput>` — a multi-select rendered as a list of checkboxes, the
 * Vue analog of `@chelone/react`'s `inputs/checkbox-group-input.tsx`. Reads
 * choices via {@link useChoiceInput} and binds the WHOLE array through a single
 * {@link useInput} field (no per-item array binding — the value is the id array).
 * Renders the shared `ui/` {@link Checkbox} inside a `<fieldset>`.
 *
 * The stored value is coalesced to an array by a `format` transform so a nullish
 * value renders as an empty selection; toggling a box adds/removes its choice
 * value (string-compared, twin parity) and re-writes the whole array.
 */

import { type ChoiceValueOf, toChoiceValues } from "@chelone/core";
import { computed } from "vue";
import { useInput } from "../../../form/use-input";
import Checkbox from "../../ui/checkbox.vue";
import { FieldDescription, FieldError, FieldLabel } from "../../ui/field";
import ValidationError from "../common/validation-error.vue";
import { humanizeSource } from "./label-text";
import { useChoiceInput } from "./use-choice-input";

const props = withDefaults(defineProps<CheckboxGroupInputProps<LooseRecord, SourceProp, TChoice>>(), {
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
  componentName: "CheckboxGroupInput",
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
const values = computed(() => toChoiceValues<TChoice>(value.value));
const labelText = computed(() =>
  props.label === false ? null : (props.label ?? humanizeSource(source)),
);
const helper = computed(
  () => props.helperText ?? fetchError.value?.message,
);

function isChecked(choiceValue: ChoiceValueOf<TChoice>): boolean {
  return values.value.some((v) => String(v) === String(choiceValue));
}

function isChoiceDisabled(choice: TChoice): boolean {
  return (
    props.disabled === true ||
    props.readonly === true ||
    getDisableValue(choice) === true
  );
}

function onToggle(choiceValue: ChoiceValueOf<TChoice>, checked: boolean) {
  const next = checked
    ? [...values.value, choiceValue]
    : values.value.filter((v) => String(v) !== String(choiceValue));
  setValue(next);
  blur();
}
</script>

<template>
  <fieldset
    :class="props.class"
    :data-invalid="invalid || undefined"
    data-slot="checkbox-group"
    class="flex flex-col gap-2"
  >
    <legend v-if="labelText != null" class="text-sm font-medium leading-none">
      {{ labelText }}<span v-if="isRequired"> *</span>
    </legend>
    <div :class="['flex', row ? 'flex-row gap-4' : 'flex-col gap-2']">
      <div
        v-for="choice in allChoices"
        :key="String(getChoiceValue(choice))"
        class="flex items-center gap-2"
        :data-disabled="isChoiceDisabled(choice) || undefined"
      >
        <Checkbox
          :id="`${id}-${String(getChoiceValue(choice))}`"
          :model-value="isChecked(getChoiceValue(choice))"
          :disabled="isChoiceDisabled(choice)"
          @update:model-value="
            (checked: boolean) => onToggle(getChoiceValue(choice), checked)
          "
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
