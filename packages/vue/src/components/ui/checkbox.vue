<script setup lang="ts">
/**
 * `<Checkbox>` — the shadcn-vue checkbox primitive, the Vue analog of
 * `@chelone/react`'s `ui/checkbox.tsx` (a reka-ui `Checkbox`). Native
 * `<input type=checkbox>` kept DEPENDENCY-FREE. Reka-ui adaptation: reka-ui uses
 * `v-model:checked`; this slice exposes shadcn's `modelValue` boolean contract.
 */

import { computed } from "vue";
import { cn } from "../../lib/utils";

const props = defineProps<{
  modelValue?: boolean;
  id?: string;
  disabled?: boolean;
  ariaLabel?: string;
  class?: string;
}>();

const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const classes = computed(() =>
  cn(
    "h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50",
    props.class,
  ),
);

function onChange(event: Event) {
  emit("update:modelValue", (event.target as HTMLInputElement).checked);
}
</script>

<template>
  <input
    :id="id"
    type="checkbox"
    :checked="modelValue"
    :disabled="disabled"
    :aria-label="ariaLabel"
    :class="classes"
    data-slot="checkbox"
    @change="onChange"
  />
</template>
