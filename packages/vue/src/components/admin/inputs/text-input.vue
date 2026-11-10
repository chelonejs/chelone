<script lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
import type {
  LooseRecord,
  ResourceRecord,
  SourceProp,
} from "@chelone/core";

/**
 * Props for {@link TextInput}.
 *
 * The record is a type parameter so a generic wrapper can hand `<TextInput>` the
 * `SourceProp<TRecord>` it holds, as `<InPlaceEditor>` does. It stays a
 * `ResourceRecord`, which is what keeps a bare `source="nope"` checked against
 * the registered paths instead of inferring a record that has it.
 */
export interface TextInputProps<
  RecordType extends ResourceRecord = LooseRecord,
> {
  source: SourceProp<RecordType>;
  label?: string | false;
  type?: string;
  defaultValue?: string;
  validate?: Validator | readonly Validator[];
  helperText?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  autocomplete?: string;
  autofocus?: boolean;
  /** Class applied to the inner `<Input>` control (wrappers reserve trailing room). */
  inputClass?: string;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
/**
 * `<TextInput>` — single-line text input, the Vue analog of `@chelone/react`'s
 * `inputs/text-input.tsx`. Binds ONE field via `useInput` (Task 6) and renders
 * the shadcn `Field` + `Input` primitives. The error is the already-displayable
 * `string | TranslatableMessage` off `useInput` (rendered through
 * `<ValidationError>`), never an RHF `error.root.message`.
 *
 * The control sits in a row of its own with the `controlSuffix` slot, so a wrapper
 * can overlay a button on it and have that button centred on the control whatever
 * the field renders above or below the row.
 */

import { toTextValue, type Validator } from "@chelone/core";
import { computed } from "vue";
import { useInput } from "../../../form/use-input";
import { Field, FieldError, FieldLabel } from "../../ui/field";
import Input from "../../ui/input.vue";
import ValidationError from "../common/validation-error.vue";
import { humanizeSource } from "./label-text";

const props = withDefaults(defineProps<TextInputProps<RecordType>>(), {
  label: undefined,
});

const { id, value, setValue, blur, error, touched, isRequired } = useInput<
  // type-escape: context: no record, so the record-free form is the sentinel `SourcePath` and `SourceValue` test for
  unknown,
  string,
  string
>({
  source: props.source,
  defaultValue: props.defaultValue,
  validate: props.validate,
  // A stored number reads as its digits, an object as empty.
  format: toTextValue,
  // Coercion papercut fix: core's `defaultParse` maps `""` → `null`, so a
  // CLEARED required text field would be validated as `null` and a zod
  // `z.string().min(1)` schema fires its "Expected string, received null" TYPE
  // error before the friendly `.min(1)` refinement can run. Keep a cleared text
  // field an empty STRING (identity parse) so the string refinement — and its
  // custom/i18n message — is what surfaces.
  parse: (input: string) => input,
});

const invalid = computed(() => touched.value && error.value != null);
const labelText = computed(() =>
  props.label === false ? null : (props.label ?? humanizeSource(props.source)),
);
</script>

<template>
  <Field :class="props.class" :data-invalid="invalid">
    <FieldLabel v-if="labelText != null" :html-for="id">
      {{ labelText }}<span v-if="isRequired"> *</span>
    </FieldLabel>
    <div class="relative flex items-center">
      <Input
        :id="id"
        :type="type ?? 'text'"
        :model-value="value"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :autocomplete="autocomplete"
        :autofocus="autofocus"
        :aria-invalid="invalid"
        :class="inputClass"
        @update:model-value="setValue"
        @blur="blur"
      />
      <slot name="controlSuffix" />
    </div>
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
