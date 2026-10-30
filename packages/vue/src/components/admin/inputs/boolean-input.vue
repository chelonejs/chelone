<script lang="ts">
/** Props for {@link BooleanInput}. */
export interface BooleanInputProps {
  source: string;
  label?: string | false;
  defaultValue?: boolean;
  validate?: Validator | readonly Validator[];
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<BooleanInput>` — toggle switch for boolean values, the Vue analog of
 * `@chelone/react`'s `inputs/boolean-input.tsx`. Binds through `useInput` and
 * renders the shadcn `Switch`. Writes a plain boolean; marks the field blurred
 * on change so validation surfaces on interaction.
 */

import type { Validator } from "@chelone/core";
import { computed } from "vue";
import { useInput } from "../../../form/use-input";
import { Field, FieldError, FieldLabel } from "../../ui/field";
import Switch from "../../ui/switch.vue";
import ValidationError from "../common/validation-error.vue";
import { humanizeSource } from "./label-text";

const props = withDefaults(defineProps<BooleanInputProps>(), {
  label: undefined,
});

const { id, value, setValue, blur, error, touched, isRequired } = useInput({
  source: props.source,
  defaultValue: props.defaultValue ?? false,
  validate: props.validate,
});

const checked = computed(() => Boolean(value.value));
const invalid = computed(() => touched.value && error.value != null);
const labelText = computed(() =>
  props.label === false ? null : (props.label ?? humanizeSource(props.source)),
);

function onChange(next: boolean) {
  setValue(next);
  blur();
}
</script>

<template>
  <Field :class="props.class" :data-invalid="invalid">
    <div class="flex items-center gap-2">
      <Switch
        :id="id"
        :model-value="checked"
        :aria-invalid="invalid"
        @update:model-value="onChange"
      />
      <FieldLabel v-if="labelText != null" :html-for="id">
        {{ labelText }}<span v-if="isRequired"> *</span>
      </FieldLabel>
    </div>
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
