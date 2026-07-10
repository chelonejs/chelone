<script setup lang="ts">
/**
 * `<NumberInput>` — numeric input, the Vue analog of `@chelone/react`'s
 * `inputs/number-input.tsx`. Keeps a LOCAL string buffer so a user can type an
 * incomplete number (`-`, `0.`) before it is parsed, and writes `null` (not `0`)
 * on empty so required validation still triggers. Binds through `useInput`.
 */

import type { Validator } from "@chelone/core";
import { computed, ref, watch } from "vue";
import { useInput } from "../../../form/use-input";
import { Field, FieldError, FieldLabel } from "../../ui/field";
import Input from "../../ui/input.vue";
import ValidationError from "../common/validation-error.vue";
import { humanizeSource } from "./label-text";

const props = withDefaults(defineProps<{
  source: string;
  label?: string | false;
  defaultValue?: unknown;
  validate?: Validator | readonly Validator[];
  class?: string;
}>(), {
  label: undefined,
});

/** Parse the raw string to a number, or `null` on empty/unparseable. */
function toNumber(raw: string): number | null {
  if (raw == null || raw === "") return null;
  const parsed = Number.parseFloat(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

const { id, value, setValue, blur, error, touched, isRequired } = useInput({
  source: props.source,
  defaultValue: props.defaultValue,
  validate: props.validate,
  // Store a real number (or null), not the display string.
  parse: (input: unknown) => toNumber(String(input ?? "")),
});

// The local string buffer, seeded from the form value and re-synced when the
// field value changes from outside (record hydration, reset) but not focused.
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
  setValue(toNumber(raw));
}
function onBlur() {
  focused.value = false;
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
      type="number"
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
