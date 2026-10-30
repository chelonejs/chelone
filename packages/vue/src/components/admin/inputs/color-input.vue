<script lang="ts">
/** Props for {@link ColorInput}. */
export interface ColorInputProps {
  source: string;
  label?: string | false;
  defaultValue?: unknown;
  validate?: Validator | readonly Validator[];
  helperText?: string;
  swatches?: readonly string[];
  disabled?: boolean;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<ColorInput>` — a color picker input storing a CSS color string (hex), the
 * Vue analog of `@chelone/react`'s `inputs/color-input.tsx`. The React twin
 * wraps a rich `<ColorPicker>` popover (oklch pad + hue/alpha strips) with a
 * `native` escape hatch to `<input type="color">`. The Vue `ui/` slice has no
 * popover color primitive yet (deferred wave), so this renders the browser's
 * NATIVE `<input type="color">` — the same value contract (a hex string) — plus
 * the optional quick-set `swatches` row. Binds via `useInput` + `<ValidationError>`.
 */

import type { Validator } from "@chelone/core";
import { computed } from "vue";
import { useInput } from "../../../form/use-input";
import { cn } from "../../../lib/utils";
import { Field, FieldError, FieldLabel } from "../../ui/field";
import ValidationError from "../common/validation-error.vue";
import { humanizeSource } from "./label-text";

const props = withDefaults(defineProps<ColorInputProps>(), {
  label: undefined,
});

const { id, value, setValue, blur, error, touched, isRequired } = useInput({
  source: props.source,
  defaultValue: props.defaultValue,
  validate: props.validate,
});

// Native `<input type="color">` requires a valid `#rrggbb`; fall back to black
// when the field is empty/nullish (mirrors the React twin's `?? "#000000"`).
const displayValue = computed(() => {
  const v = value.value;
  return typeof v === "string" && v !== "" ? v : "#000000";
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
    <div
      :class="cn('flex items-center gap-2', disabled && 'cursor-not-allowed opacity-50')"
    >
      <input
        :id="id"
        type="color"
        :value="displayValue"
        :disabled="disabled"
        :aria-invalid="invalid || undefined"
        aria-label="Pick a color"
        class="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1 disabled:cursor-not-allowed"
        data-slot="color-input"
        @input="setValue"
        @blur="blur"
      />
      <button
        v-for="s in swatches"
        :key="s"
        type="button"
        data-color-swatch
        :aria-label="`Select color ${s}`"
        :disabled="disabled"
        :class="cn('h-6 w-6 rounded border border-border focus-visible:ring-2 focus-visible:ring-ring', disabled && 'cursor-not-allowed')"
        :style="{ backgroundColor: s }"
        @click="setValue(s)"
      />
    </div>
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
