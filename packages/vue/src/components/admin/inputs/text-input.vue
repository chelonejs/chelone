<script setup lang="ts">
/**
 * `<TextInput>` — single-line text input, the Vue analog of `@chelone/react`'s
 * `inputs/text-input.tsx`. Binds ONE field via `useInput` (Task 6) and renders
 * the shadcn `Field` + `Input` primitives. The error is the already-displayable
 * `string | TranslatableMessage` off `useInput` (rendered through
 * `<ValidationError>`), never an RHF `error.root.message`.
 */

import type { Validator } from "@chelone/core";
import { computed } from "vue";
import { useInput } from "../../../form/use-input";
import { Field, FieldError, FieldLabel } from "../../ui/field";
import Input from "../../ui/input.vue";
import ValidationError from "../common/validation-error.vue";
import { humanizeSource } from "./label-text";

const props = defineProps<{
  source: string;
  label?: string | false;
  type?: string;
  defaultValue?: unknown;
  validate?: Validator | readonly Validator[];
  helperText?: string;
  class?: string;
}>();

const { id, value, setValue, blur, error, touched, isRequired } = useInput({
  source: props.source,
  defaultValue: props.defaultValue,
  validate: props.validate,
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
    <Input
      :id="id"
      :type="type ?? 'text'"
      :model-value="value as string"
      :aria-invalid="invalid"
      @update:model-value="setValue"
      @blur="blur"
    />
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
