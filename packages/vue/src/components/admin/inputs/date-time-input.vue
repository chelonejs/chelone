<script lang="ts" generic="RecordType = LooseRecord, TPath extends SourceProp<RecordType> = SourceProp<RecordType>">
import type { DateInputValue, LooseRecord, SourceProp, SourceValue } from "@chelone/core";
import type { SourceInputProps } from "./source-input-props";

/** Props for {@link DateTimeInput}. */
export interface DateTimeInputProps<
  RecordType = LooseRecord,
  TPath extends SourceProp<RecordType> = SourceProp<RecordType>,
> extends SourceInputProps<RecordType, TPath> {
  /** Read transform (form value → display string). Default {@link formatDateTime}. */
  format?: (value: DateInputValue) => string;
  /** Write transform (display string → stored value). Default {@link parseDateTimeToISO}. */
  parse?: (input: string) => NoInfer<SourceValue<RecordType, TPath>>;
  helperText?: string;
  disabled?: boolean;
  readonly?: boolean;
  inputClass?: string;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType = LooseRecord, TPath extends SourceProp<RecordType> = SourceProp<RecordType>">
/**
 * `<DateTimeInput>` — native `datetime-local` picker, the Vue analog of
 * `@chelone/react`'s `inputs/date-time-input.tsx`. Formats an incoming ISO
 * string / `Date` / timestamp to the local `yyyy-MM-ddThh:mm` display value and
 * parses the entered value back to an ISO 8601 string (browser timezone). Empty
 * → `null`, so a required validator fires. Same focused-buffer pattern as
 * `<DateInput>`.
 */

import { textOf, toDateInputValue, toTextValue } from "@chelone/core";
import { computed, ref, watch } from "vue";
import { useInput } from "../../../form/use-input";
import { Field, FieldError, FieldLabel } from "../../ui/field";
import { cn } from "../../../lib/utils";
import Input from "../../ui/input.vue";
import ValidationError from "../common/validation-error.vue";
import {
  formatDateTime,
  isValidDateTime,
  PICKER_INPUT_CLASS,
  parseDateTimeToISO,
} from "./date-input-format";
import { humanizeSource } from "./label-text";

const props = withDefaults(
  defineProps<DateTimeInputProps<RecordType, TPath>>(),
  // See `<DateInput>`: default `label` to `undefined` so the Boolean-prop rule
  // doesn't coerce an absent label to `false` and suppress it.
  { label: undefined },
);

const format = computed(() => props.format ?? formatDateTime);
const parse = computed(() => props.parse ?? parseDateTimeToISO);
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
  if (raw !== "" && isValidDateTime(raw)) setValue(raw);
}
function onBlur() {
  focused.value = false;
  if (isValidDateTime(buffer.value)) setValue(buffer.value);
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
      type="datetime-local"
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
