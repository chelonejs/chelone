<script lang="ts" generic="RecordType = LooseRecord, TPath extends SourceProp<RecordType> = SourceProp<RecordType>">
import type { DateInputValue, LooseRecord, SourceProp, SourceValue } from "@chelone/core";
import type { SourceInputProps } from "./source-input-props";

/** Props for {@link DateInput}. */
export interface DateInputProps<
  RecordType = LooseRecord,
  TPath extends SourceProp<RecordType> = SourceProp<RecordType>,
> extends SourceInputProps<RecordType, TPath> {
  /** Read transform (form value → display string). Default {@link formatDate}. */
  format?: (value: DateInputValue) => string | null;
  /** Write transform (display string → stored value). Default core parse (""→null). */
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
 * `<DateInput>` — native date picker for a "YYYY-MM-DD" value, the Vue analog of
 * `@chelone/react`'s `inputs/date-input.tsx`. Formats an incoming string / ISO /
 * `Date` / timestamp to a bare date string and stores the typed date string
 * (empty → `null` via core's default parse, so a required validator fires).
 *
 * Like `<NumberInput>`, it keeps a LOCAL string buffer so a partial entry isn't
 * clobbered while typing — the twin's uncontrolled `defaultValue` + `key`-remount
 * dance (born of RHF's `field.ref`) maps to a focused-buffer + external re-sync.
 */

import { textOf, toDateInputValue, toTextValue } from "@chelone/core";
import { computed, ref, watch } from "vue";
import { useInput } from "../../../form/use-input";
import { Field, FieldError, FieldLabel } from "../../ui/field";
import { cn } from "../../../lib/utils";
import Input from "../../ui/input.vue";
import ValidationError from "../common/validation-error.vue";
import { formatDate, isValidDate, PICKER_INPUT_CLASS } from "./date-input-format";
import { humanizeSource } from "./label-text";

const props = withDefaults(
  defineProps<DateInputProps<RecordType, TPath>>(),
  // A `string | false` prop is inferred Boolean-inclusive, so an ABSENT `label`
  // would coerce to `false` (Vue's boolean-prop rule) and suppress the label.
  // Default it to `undefined` so the humanized fallback renders.
  { label: undefined },
);

const format = computed(() => props.format ?? formatDate);
const userParse = props.parse;
const { id, value, setValue, blur, error, touched, isRequired } = useInput({
  source: props.source,
  defaultValue: props.defaultValue,
  validate: props.validate,
  format: (v) => format.value(toDateInputValue(v)),
  parse: userParse && ((v) => userParse(toTextValue(v))),
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
  // Skip empty while typing so a partial entry isn't clobbered; blur handles it.
  if (raw !== "" && isValidDate(raw)) setValue(raw);
}
function onBlur() {
  focused.value = false;
  if (isValidDate(buffer.value)) setValue(buffer.value);
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
      type="date"
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
