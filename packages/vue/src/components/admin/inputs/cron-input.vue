<script lang="ts">
import type { SourceProp, Validator } from "@chelone/core";

/** Props for {@link CronInput}. */
export interface CronInputProps {
  source: SourceProp;
  label?: string | false;
  defaultValue?: unknown;
  validate?: Validator | readonly Validator[];
  disabled?: boolean;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<CronInput>` — edits a 5-field cron expression and previews its human meaning
 * live, the Vue analog of `@chelone/react`'s `inputs/cron-input.tsx`. Binds a
 * plain string through `useInput`; the preview is `describeCron` (via cronstrue)
 * off the current value, or `"Invalid cron"` for a non-empty unparseable string.
 */

import { computed } from "vue";
import { useInput } from "../../../form/use-input";
import { Field, FieldError, FieldLabel } from "../../ui/field";
import Input from "../../ui/input.vue";
import ValidationError from "../common/validation-error.vue";
import { describeCron } from "./cron-utils";
import { humanizeSource } from "./label-text";

// Explicit `undefined` default disables Vue's absent-Boolean cast of the
// `string | false` `label` prop (else absent → `false` hides the fallback).
const props = withDefaults(defineProps<CronInputProps>(), { label: undefined });

const { id, value, setValue, blur, error, touched, isRequired } = useInput({
  source: props.source,
  defaultValue: props.defaultValue,
  validate: props.validate,
});

const expr = computed(() => (value.value as string) ?? "");
const preview = computed(() => (expr.value ? describeCron(expr.value) : null));
const previewText = computed(() =>
  preview.value ?? (expr.value ? "Invalid cron" : ""),
);
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
    <div class="flex flex-col gap-1">
      <Input
        :id="id"
        type="text"
        :model-value="expr"
        :disabled="disabled"
        :aria-invalid="invalid"
        placeholder="* * * * *"
        class="font-mono"
        @update:model-value="setValue"
        @blur="blur"
      />
      <span data-cron-preview class="text-muted-foreground text-xs">{{
        previewText
      }}</span>
    </div>
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
