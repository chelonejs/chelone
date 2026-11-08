<script lang="ts">
/** Props for {@link NullableBooleanInput}. */
export interface NullableBooleanInputProps {
  source: SourceProp;
  label?: string | false;
  nullLabel?: string;
  trueLabel?: string;
  falseLabel?: string;
  validate?: Validator | readonly Validator[];
  /** Read transform (`true`, `false` or `null` as stored → the select's `"true"`, `"false"` or `""`). */
  format?: (value: boolean | null) => string;
  /** Write transform (the select's `"true"`, `"false"` or `""` → stored value). */
  parse?: (value: string) => boolean | null;
  disabled?: boolean;
  helperText?: string;
  class?: string;
}
</script>

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

import type { SourceProp, Validator } from "@chelone/core";
import { toNullableBooleanValue } from "@chelone/core";
import { computed } from "vue";
import { useInput } from "../../../form/use-input";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import { Field, FieldError, FieldLabel } from "../../ui/field";
import NativeSelect from "../../ui/native-select.vue";
import ValidationError from "../common/validation-error.vue";
import { humanizeSource } from "./label-text";

const props = withDefaults(defineProps<NullableBooleanInputProps>(), {
  label: undefined,
});

const getStringFromBoolean = (value: boolean | null): string => {
  if (value === true) return "true";
  if (value === false) return "false";
  return "";
};
const getBooleanFromString = (value: string): boolean | null => {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

const translate = useTranslate();
const { id, value, setValue, blur, error, touched, isRequired } = useInput({
  source: props.source,
  validate: props.validate,
});

// `format` and `parse` run here on the select's text, so the binding keeps its
// defaults.
const selectValue = computed(() =>
  (props.format ?? getStringFromBoolean)(toNullableBooleanValue(value.value)),
);
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
      : translate("chelone.boolean.null", { _: "" }),
  },
  {
    value: "false",
    label: props.falseLabel
      ? translate(props.falseLabel, { _: props.falseLabel })
      : translate("chelone.boolean.false", { _: "No" }),
  },
  {
    value: "true",
    label: props.trueLabel
      ? translate(props.trueLabel, { _: props.trueLabel })
      : translate("chelone.boolean.true", { _: "Yes" }),
  },
]);

function onChange(next: string) {
  setValue((props.parse ?? getBooleanFromString)(next));
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
