<script setup lang="ts">
/**
 * `<Switch>` — the shadcn-vue toggle primitive, the Vue analog of
 * `@chelone/react`'s `ui/switch.tsx` (a reka-ui `Switch`). Kept DEPENDENCY-FREE:
 * a native checkbox styled as a switch track/thumb. Reka-ui adaptation note: the
 * reka-ui `Switch` uses `v-model:checked` / `@update:checked`; this native slice
 * exposes shadcn's `modelValue` + `@update:modelValue` (boolean) so the
 * `<BooleanInput>` binds a plain boolean either way.
 */

import { computed } from "vue";
import { cn } from "../../lib/utils";

const props = defineProps<{
  modelValue?: boolean;
  id?: string;
  disabled?: boolean;
  ariaInvalid?: boolean;
  class?: string;
}>();

const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const trackClasses = computed(() =>
  cn(
    "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
    props.modelValue ? "bg-primary" : "bg-input",
    props.class,
  ),
);

function onChange(event: Event) {
  if (event.target instanceof HTMLInputElement)
    emit("update:modelValue", event.target.checked);
}
</script>

<template>
  <span :class="trackClasses" data-slot="switch">
    <input
      :id="id"
      type="checkbox"
      role="switch"
      class="sr-only"
      :checked="modelValue"
      :disabled="disabled"
      :aria-invalid="ariaInvalid || undefined"
      @change="onChange"
    />
    <span
      :class="cn(
        'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
        modelValue ? 'translate-x-4' : 'translate-x-0',
      )"
    />
  </span>
</template>
