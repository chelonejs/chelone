<script lang="ts">
import type { SourceProp, Validator } from "@chelone/core";

/** Props for {@link TextArrayInput}. */
export interface TextArrayInputProps {
  source: SourceProp;
  label?: string | false;
  defaultValue?: readonly string[];
  validate?: Validator | readonly Validator[];
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<TextArrayInput>` — edits an array of strings (tags / emails), the Vue analog
 * of `@chelone/react`'s `inputs/text-array-input.tsx`. A SINGLE `useInput`-bound
 * field holds the whole `string[]` (no per-item array binding): type text and
 * press Enter to add, Backspace on an empty input to remove the last, or click a
 * tag's × to remove it. `format` maps a nullish stored value to an empty array
 * so the composite render never dereferences `null`.
 *
 * The React twin's optional autocomplete (a Popover + Command dropdown over an
 * `options` list) is DEFERRED here: the Vue `ui/` slice ships no Popover/Command
 * primitive, so this port covers the add/remove/backspace core that the twin's
 * tests exercise. The dropdown can layer on once those primitives land.
 */

import { toTextList } from "@chelone/core";
import { computed, ref } from "vue";
import { useInput } from "../../../form/use-input";
import { useTranslate } from "../../../i18n/use-translate";
import { Field, FieldError, FieldLabel } from "../../ui/field";
import ValidationError from "../common/validation-error.vue";
import { humanizeSource } from "./label-text";

// `label` is `string | false`; Vue would Boolean-cast an ABSENT `label` to
// `false` (so the humanized fallback never shows). An explicit `undefined`
// default disables that cast — absent stays `undefined` → humanized label.
const props = withDefaults(defineProps<TextArrayInputProps>(), {
  label: undefined,
});

const {
  id,
  value: values,
  setValue,
  blur,
  error,
  touched,
  isRequired,
} = useInput<unknown, string, string[]>({ // type-escape: context: no record, so the record-free form is the sentinel `SourcePath` and `SourceValue` test for
  source: props.source,
  defaultValue: props.defaultValue,
  validate: props.validate,
  // A stored non-array renders as an empty tag list, not `''`.
  format: toTextList,
});

const translate = useTranslate();
const inputValue = ref("");

const invalid = computed(() => touched.value && error.value != null);
const labelText = computed(() =>
  props.label === false ? null : (props.label ?? humanizeSource(props.source)),
);

function addValue(text: string) {
  const trimmed = text.trim();
  if (trimmed) setValue([...values.value, trimmed]);
  inputValue.value = "";
}

function removeValue(index: number) {
  setValue(values.value.filter((_, i) => i !== index));
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === "Enter") {
    event.preventDefault();
    if (inputValue.value.trim()) addValue(inputValue.value);
  } else if (
    event.key === "Backspace" &&
    inputValue.value === "" &&
    values.value.length > 0 &&
    !props.readonly
  ) {
    setValue(values.value.slice(0, -1));
  }
}

function onBlur() {
  if (inputValue.value.trim()) addValue(inputValue.value);
  blur();
}
</script>

<template>
  <Field :class="props.class" :data-invalid="invalid">
    <FieldLabel v-if="labelText != null" :html-for="id">
      {{ labelText }}<span v-if="isRequired"> *</span>
    </FieldLabel>
    <div
      class="group flex flex-wrap gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-within:ring-1 focus-within:ring-ring"
    >
      <span
        v-for="(tag, index) in values"
        :key="`${tag}-${index}`"
        class="inline-flex items-center gap-1 rounded border border-input px-2 py-0.5 text-xs"
      >
        {{ tag }}
        <button
          type="button"
          class="cursor-pointer rounded-full outline-none focus:ring-2 focus:ring-ring"
          :disabled="disabled || readonly"
          @mousedown.prevent.stop
          @click.prevent="removeValue(index)"
        >
          <span class="sr-only">{{
            translate("chelone.action.remove", { _: "Remove" })
          }}</span>
          <span aria-hidden="true">×</span>
        </button>
      </span>
      <input
        :id="id"
        v-model="inputValue"
        type="text"
        :aria-invalid="invalid || undefined"
        :placeholder="values.length === 0 ? placeholder : undefined"
        :disabled="disabled"
        :readonly="readonly"
        class="ml-1 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        @keydown="onKeyDown"
        @blur="onBlur"
      />
    </div>
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
