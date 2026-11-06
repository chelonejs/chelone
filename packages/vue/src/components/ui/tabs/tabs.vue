<script setup lang="ts">
/**
 * `<Tabs>` — the root of the dependency-free tabs family, the Vue analog of
 * shadcn's radix-backed `Tabs`. Works controlled (`v-model`) or uncontrolled
 * (`defaultValue`): a defined `modelValue` decides the active tab, and a click
 * then only emits `update:modelValue`. Every root takes the next number from a
 * module counter (`nextTabsIdBase`), so two tab sets on one page never share an id.
 */

import { computed, ref } from "vue";
import { cn } from "../../../lib/utils";
import { nextTabsIdBase, provideTabs } from "./context";

const props = defineProps<{
  modelValue?: string;
  defaultValue?: string;
  class?: string;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const idBase = nextTabsIdBase();
const uncontrolled = ref(props.defaultValue);
const value = computed(() => props.modelValue ?? uncontrolled.value);

provideTabs({
  value,
  select(next) {
    uncontrolled.value = next;
    emit("update:modelValue", next);
  },
  triggerId: (tab) => `${idBase}-trigger-${tab}`,
  panelId: (tab) => `${idBase}-content-${tab}`,
});
</script>

<template>
  <div
    data-slot="tabs"
    data-orientation="horizontal"
    :class="
      cn(
        'group/tabs flex gap-2 data-[orientation=horizontal]:flex-col',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
