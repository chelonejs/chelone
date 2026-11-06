<script setup lang="ts">
/**
 * `<Input>` — the shadcn-vue text/number input primitive, the Vue analog of
 * `@chelone/react`'s `ui/input.tsx`. Wraps a native `<input>` with `v-model`
 * support (the `modelValue` / `update:modelValue` contract reka-ui-based shadcn
 * inputs use). The React twin binds `value` + `onChange` off `useInput`'s
 * `field`; here the admin inputs bind `:model-value` + `@update:model-value`.
 */

import { computed, onMounted, useTemplateRef } from "vue";
import { cn } from "../../lib/utils";

const props = defineProps<{
  modelValue?: string | number | null;
  type?: string;
  id?: string;
  disabled?: boolean;
  readonly?: boolean;
  autocomplete?: string;
  autofocus?: boolean;
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
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
    props.class,
  ),
);

const input = useTemplateRef<HTMLInputElement>("input");

// The native `autofocus` attribute is ignored on an input added after page
// load, so focus it ourselves, as React's `autoFocus` does.
onMounted(() => {
  if (props.autofocus) input.value?.focus();
});

function onInput(event: Event) {
  if (event.target instanceof HTMLInputElement)
    emit("update:modelValue", event.target.value);
}
</script>

<template>
  <input
    :id="id"
    ref="input"
    :type="type ?? 'text'"
    :value="modelValue ?? ''"
    :disabled="disabled"
    :readonly="readonly"
    :autocomplete="autocomplete"
    :aria-invalid="ariaInvalid || undefined"
    :class="classes"
    data-slot="input"
    @input="onInput"
    @blur="emit('blur', $event)"
    @focus="emit('focus', $event)"
  />
</template>
