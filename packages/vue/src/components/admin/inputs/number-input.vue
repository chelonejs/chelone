<script lang="ts" generic="RecordType = LooseRecord, TPath extends SourceProp<RecordType> = SourceProp<RecordType>">
import type { LooseRecord, SourceProp } from "@chelone/core";
import type { SourceInputProps } from "./source-input-props";

/** Props for {@link NumberInput}. */
export interface NumberInputProps<
  RecordType = LooseRecord,
  TPath extends SourceProp<RecordType> = SourceProp<RecordType>,
> extends SourceInputProps<RecordType, TPath> {
  /** Text the input shows for the stored number (`null` when empty). */
  format?: (value: number | null) => string;
  /** The number to store for the text the user typed (`null` when empty or unparseable). */
  parse?: (value: string) => number | null;
  /** Lowest value the native input accepts. */
  min?: number;
  /** Highest value the native input accepts. */
  max?: number;
  /** How far the native input's spinner steps. */
  step?: number;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType = LooseRecord, TPath extends SourceProp<RecordType> = SourceProp<RecordType>">
/**
 * `<NumberInput>` — numeric input, the Vue analog of `@chelone/react`'s
 * `inputs/number-input.tsx`. Keeps a LOCAL string buffer so a user can type an
 * incomplete number (`-`, `0.`) before it is parsed, and writes `null` (not `0`)
 * on empty so required validation still triggers. Binds through `useInput`.
 */

import { textOf, toNumberValue } from "@chelone/core";
import { computed, ref, watch } from "vue";
import { useInput } from "../../../form/use-input";
import { Field, FieldError, FieldLabel } from "../../ui/field";
import Input from "../../ui/input.vue";
import ValidationError from "../common/validation-error.vue";
import { humanizeSource } from "./label-text";

const props = withDefaults(
  defineProps<NumberInputProps<RecordType, TPath>>(),
  { label: undefined },
);

const defaultFormat = (value: number | null): string =>
  textOf(value);

/** Parse the raw string to a number, or `null` on empty/unparseable. */
const convertStringToNumber = (value: string | number): number | null => {
  if (value === "") return null;
  const float = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isNaN(float) ? null : float;
};

// `format` and `parse` run here on the local string buffer, so the binding
// keeps its defaults and `parse` runs once per edit.
const { id, value, setValue, blur, error, touched, isRequired } = useInput({
  source: props.source,
  defaultValue: props.defaultValue,
  validate: props.validate,
});

const display = computed(() =>
  (props.format ?? defaultFormat)(toNumberValue(value.value)),
);

// The local string buffer, seeded from the form value and re-synced when the
// field value changes from outside (record hydration, reset) but not focused.
const buffer = ref(display.value);
const focused = ref(false);
watch(display, (next) => {
  if (!focused.value) buffer.value = next;
});

const invalid = computed(() => touched.value && error.value != null);
const labelText = computed(() =>
  props.label === false ? null : (props.label ?? humanizeSource(props.source)),
);

function onInput(raw: string) {
  buffer.value = raw;
  setValue((props.parse ?? convertStringToNumber)(raw));
}
function onBlur() {
  focused.value = false;
  blur();
  buffer.value = display.value;
}
</script>

<template>
  <Field :class="props.class" :data-invalid="invalid">
    <FieldLabel v-if="labelText != null" :html-for="id">
      {{ labelText }}<span v-if="isRequired"> *</span>
    </FieldLabel>
    <Input
      :id="id"
      type="number"
      :min="min"
      :max="max"
      :step="step"
      :model-value="buffer"
      :aria-invalid="invalid"
      @focus="focused = true"
      @update:model-value="onInput"
      @blur="onBlur"
    />
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
