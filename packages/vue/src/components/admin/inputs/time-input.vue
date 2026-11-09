<script lang="ts" generic="RecordType = LooseRecord, TPath extends SourceProp<RecordType> = SourceProp<RecordType>">
import type { DateInputValue, LooseRecord, SourceProp, SourceValue } from "@chelone/core";
import type { SourceInputProps } from "./source-input-props";

/** Props for {@link TimeInput}. */
export interface TimeInputProps<
  RecordType = LooseRecord,
  TPath extends SourceProp<RecordType> = SourceProp<RecordType>,
> extends SourceInputProps<RecordType, TPath> {
  helperText?: string;
  disabled?: boolean;
  readonly?: boolean;
  inputClass?: string;
  /** Read transform (form value → display string). Default {@link formatTime}. */
  format?: (value: DateInputValue) => string;
  /** Write transform (display string → stored value). Default {@link parseTimeToDate}. */
  parse?: (input: string) => SourceValue<RecordType, TPath>;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType = LooseRecord, TPath extends SourceProp<RecordType> = SourceProp<RecordType>">
/**
 * `<TimeInput>` — native time picker for a time-of-day value, the Vue analog of
 * `@chelone/react`'s `inputs/time-input.tsx`. Formats an incoming "HH:mm" string
 * / `Date` to the display value and — by the default `parse` — stores a `Date`
 * at today's date with the entered time (pass a custom `parse` to store a raw
 * string). Empty → `null`, so a required validator fires. Same focused-buffer
 * pattern as `<DateInput>`.
 */

import { textOf, toDateInputValue, toTextValue } from "@chelone/core";
import { computed, ref, watch } from "vue";
import { useInput } from "../../../form/use-input";
import { Field, FieldError, FieldLabel } from "../../ui/field";
import { cn } from "../../../lib/utils";
import Input from "../../ui/input.vue";
import ValidationError from "../common/validation-error.vue";
import { formatTime, isValidTime, PICKER_INPUT_CLASS, parseTimeToDate } from "./date-input-format";
import { humanizeSource } from "./label-text";

const props = withDefaults(
  defineProps<TimeInputProps<RecordType, TPath>>(),
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
  format: (v) => format.value(toDateInputValue(v)),
  parse: (v) => parse.value(toTextValue(v)),
});

const buffer = ref(textOf(value.value));
const focused = ref(false);
watch(value, (next) => {
  if (!focused.value) buffer.value = textOf(next);
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
  buffer.value = textOf(value.value);
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
      :class="cn(PICKER_INPUT_CLASS, inputClass)"
      @focus="focused = true"
      @update:model-value="onInput"
      @blur="onBlur"
    />
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
