<script setup lang="ts">
/**
 * `<Tabs>` — the root of the dependency-free tabs family, the Vue analog of
 * shadcn's radix-backed `Tabs`. Works controlled (`v-model`) or uncontrolled
 * (`defaultValue`): a defined `modelValue` decides the active tab, and a click
 * then only emits `update:modelValue`. Every root takes the next number from a
 * module counter (`nextTabsIdBase`), so two tab sets on one page never share an id.
 */

import { computed, ref, shallowReactive } from "vue";
import { cn } from "../../../lib/utils";
import {
  nextTabsIdBase,
  provideTabs,
  type TabsOrientation,
  type TabsTriggerEntry,
} from "./context";

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    defaultValue?: string;
    orientation?: TabsOrientation;
    class?: string;
  }>(),
  { orientation: "horizontal" },
);
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const idBase = nextTabsIdBase();
const uncontrolled = ref(props.defaultValue);
const value = computed(() => props.modelValue ?? uncontrolled.value);

const triggers = shallowReactive<TabsTriggerEntry[]>([]);

const tabbableValue = computed(() => {
  // Before the triggers mount (and on the server) trust the active value, so the
  // first render already has its tabbable trigger.
  if (triggers.length === 0) return value.value;
  const enabled = triggers
    .filter((entry) => !entry.disabled())
    .sort((a, b) =>
      a.element.compareDocumentPosition(b.element) &
      Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1,
    );
  return enabled.some((entry) => entry.value === value.value)
    ? value.value
    : enabled[0]?.value;
});

provideTabs({
  value,
  orientation: computed(() => props.orientation),
  tabbableValue,
  registerTrigger(entry) {
    triggers.push(entry);
    return () => {
      const index = triggers.indexOf(entry);
      if (index !== -1) triggers.splice(index, 1);
    };
  },
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
    :data-orientation="orientation"
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
