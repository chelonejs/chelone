<script setup lang="ts">
/**
 * `<NativeSelect>` — a minimal native `<select>` primitive, the Vue analog of
 * `@chelone/react`'s `ui/native-select.tsx`. The V1 `<ReferenceInput>` renders a
 * plain select over the fetched choices (the reka-ui `Combobox`/`Command`
 * autocomplete surface is deferred to a later wave — spec Risk 1). Options come
 * as `{ value, label }` items; `modelValue` binds the selected FK.
 */

import { computed } from "vue";
import { cn } from "../../lib/utils";

interface Choice {
  value: string | number;
  label: string;
}

const props = defineProps<{
  modelValue?: string | number | null;
  options: Choice[];
  id?: string;
  disabled?: boolean;
  ariaInvalid?: boolean;
  placeholder?: string;
  class?: string;
}>();

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const classes = computed(() =>
  cn(
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
    props.class,
  ),
);

function onChange(event: Event) {
  emit("update:modelValue", (event.target as HTMLSelectElement).value);
}
</script>

<template>
  <select
    :id="id"
    :value="modelValue ?? ''"
    :disabled="disabled"
    :aria-invalid="ariaInvalid || undefined"
    :class="classes"
    data-slot="native-select"
    @change="onChange"
  >
    <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
    <option v-for="choice in options" :key="String(choice.value)" :value="choice.value">
      {{ choice.label }}
    </option>
  </select>
</template>
