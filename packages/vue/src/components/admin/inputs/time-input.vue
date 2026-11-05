<script lang="ts">
import type { SourceProp } from "@chelone/core";

/** Props for {@link TimeInput}. */
export interface TimeInputProps {
  source: SourceProp;
  label?: string | false;
  defaultValue?: unknown;
  validate?: Validator | readonly Validator[];
  /** Read transform (form value → display string). Default {@link formatTime}. */
  format?: (value: DateInputValue) => string;
  /** Write transform (display string → stored value). Default {@link parseTimeToDate}. */
  parse?: (input: string) => unknown;
  helperText?: string;
  disabled?: boolean;
  readonly?: boolean;
  inputClass?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<TimeInput>` — native time picker for a time-of-day value, the Vue analog of
 * `@chelone/react`'s `inputs/time-input.tsx`. Formats an incoming "HH:mm" string
 * / `Date` to the display value and — by the default `parse` — stores a `Date`
 * at today's date with the entered time (pass a custom `parse` to store a raw
 * string). Empty → `null`, so a required validator fires. Same focused-buffer
 * pattern as `<DateInput>`.
 */

import {
  type DateInputValue,
  toDateInputValue,
  toTextValue,
  type Validator,
} from "@chelone/core";
import { computed, ref, watch } from "vue";
import { useInput } from "../../../form/use-input";
import { Field, FieldError, FieldLabel } from "../../ui/field";
import Input from "../../ui/input.vue";
import ValidationError from "../common/validation-error.vue";
import { formatTime, isValidTime, parseTimeToDate } from "./date-input-format";
import { humanizeSource } from "./label-text";

const props = withDefaults(
  defineProps<TimeInputProps>(),
  // See `<DateInput>`: default `label` to `undefined` so the Boolean-prop rule
  // doesn't coerce an absent label to `false` and suppress it.
  { label: undefined },
);

const format = computed(() => props.format ?? formatTime);
const parse = computed(() => props.parse ?? parseTimeToDate);
const { id, value, setValue, blur, error, touched, isRequired } = useInput({
  source: props.source,
  defaultValue: props.defaultValue,
  validate: props.validate,
  format: (v: unknown) => format.value(toDateInputValue(v)),
  parse: (v: unknown) => parse.value(toTextValue(v)),
});

const buffer = ref(value.value == null ? "" : String(value.value));
const focused = ref(false);
watch(value, (next) => {
  if (!focused.value) buffer.value = next == null ? "" : String(next);
});

const invalid = computed(() => touched.value && error.value != null);
const labelText = computed(() =>
  props.label === false ? null : (props.label ?? humanizeSource(props.source)),
);

function onInput(raw: string) {
  buffer.value = raw;
  if (raw !== "" && isValidTime(raw)) setValue(raw);
}
function onBlur() {
  focused.value = false;
  if (isValidTime(buffer.value)) setValue(buffer.value);
  blur();
  buffer.value = value.value == null ? "" : String(value.value);
}
</script>

<template>
  <Field :class="props.class" :data-invalid="invalid">
    <FieldLabel v-if="labelText != null" :html-for="id">
      {{ labelText }}<span v-if="isRequired"> *</span>
    </FieldLabel>
    <Input
      :id="id"
      type="time"
      :model-value="buffer"
      :disabled="disabled"
      :readonly="readonly"
      :aria-invalid="invalid"
      :class="inputClass"
      @focus="focused = true"
      @update:model-value="onInput"
      @blur="onBlur"
    />
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
