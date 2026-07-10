<script setup lang="ts">
/**
 * `<NullableBooleanInput>` — a tri-state select for a `boolean | null` field,
 * the Vue analog of `@chelone/react`'s `inputs/nullable-boolean-input.tsx`.
 * Renders three options (default labels "", "No", "Yes") over the `q`-less
 * `NativeSelect`. Binds via `useInput` with the twin's `format`/`parse`:
 * `boolean → "true"|"false"|""` on read and back to `true|false|null` on write.
 *
 * Idiom note: Radix's Select (React) rejects `""` as an item value, so the twin
 * routed `null` through a `"__null__"` sentinel. The Vue slice uses a NATIVE
 * `<select>`, which accepts `""` directly — so the empty option IS the null
 * value, no sentinel round-trip.
 */

import type { Validator } from "@chelone/core";
import { computed } from "vue";
import { useInput } from "../../../form/use-input";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import { Field, FieldError, FieldLabel } from "../../ui/field";
import NativeSelect from "../../ui/native-select.vue";
import ValidationError from "../common/validation-error.vue";
import { humanizeSource } from "./label-text";

const props = defineProps<{
  source: string;
  label?: string | false;
  nullLabel?: string;
  trueLabel?: string;
  falseLabel?: string;
  validate?: Validator | readonly Validator[];
  disabled?: boolean;
  helperText?: string;
  class?: string;
}>();

const getStringFromBoolean = (v: unknown): string => {
  if (v === true) return "true";
  if (v === false) return "false";
  return "";
};
const getBooleanFromString = (v: unknown): boolean | null => {
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
};

const translate = useTranslate();
const { id, value, setValue, blur, error, touched, isRequired } = useInput({
  source: props.source,
  validate: props.validate,
  format: getStringFromBoolean,
  parse: getBooleanFromString,
});

const selectValue = computed(() => value.value as string);
const invalid = computed(() => touched.value && error.value != null);
const labelText = computed(() =>
  props.label === false || props.label === ""
    ? null
    : (props.label ?? humanizeSource(props.source)),
);

const options = computed(() => [
  {
    value: "",
    label: props.nullLabel
      ? translate(props.nullLabel, { _: props.nullLabel })
      : translate("ra.boolean.null", { _: "" }),
  },
  {
    value: "false",
    label: props.falseLabel
      ? translate(props.falseLabel, { _: props.falseLabel })
      : translate("ra.boolean.false", { _: "No" }),
  },
  {
    value: "true",
    label: props.trueLabel
      ? translate(props.trueLabel, { _: props.trueLabel })
      : translate("ra.boolean.true", { _: "Yes" }),
  },
]);

function onChange(next: string) {
  setValue(next);
  blur();
}
</script>

<template>
  <Field :class="cn('w-full min-w-20', props.class)" :data-invalid="invalid">
    <FieldLabel v-if="labelText != null" :html-for="id">
      {{ labelText }}<span v-if="isRequired"> *</span>
    </FieldLabel>
    <NativeSelect
      :id="id"
      :model-value="selectValue"
      :options="options"
      :disabled="disabled"
      :aria-invalid="invalid"
      @update:model-value="onChange"
    />
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
