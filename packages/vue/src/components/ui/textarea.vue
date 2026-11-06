<script setup lang="ts">
/**
 * `<Textarea>` — the shadcn-vue textarea primitive, the Vue analog of
 * `@chelone/react`'s `ui/textarea.tsx`. Wraps a native `<textarea>` with
 * `v-model` support (`modelValue` / `update:modelValue`), like `<Input>`.
 */

import { computed } from "vue";
import { cn } from "../../lib/utils";

const props = defineProps<{
  modelValue?: string | null;
  id?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  readonly?: boolean;
  ariaInvalid?: boolean;
  class?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  blur: [event: FocusEvent];
  focus: [event: FocusEvent];
}>();

const classes = computed(() =>
  cn(
    "flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40",
    props.class,
  ),
);

function onInput(event: Event) {
  if (event.target instanceof HTMLTextAreaElement)
    emit("update:modelValue", event.target.value);
}
</script>

<template>
  <textarea
    :id="id"
    :value="modelValue ?? ''"
    :placeholder="placeholder"
    :rows="rows"
    :disabled="disabled"
    :readonly="readonly"
    :aria-invalid="ariaInvalid || undefined"
    :class="classes"
    data-slot="textarea"
    @input="onInput"
    @blur="emit('blur', $event)"
    @focus="emit('focus', $event)"
  />
</template>
