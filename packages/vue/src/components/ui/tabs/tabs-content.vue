<script setup lang="ts">
/**
 * `<TabsContent>` — the `role="tabpanel"` for one trigger. It renders only
 * while its tab is active, so an inactive panel leaves no DOM behind.
 */

import { computed } from "vue";
import { cn } from "../../../lib/utils";
import { useTabs } from "./context";

const props = defineProps<{ value: string; class?: string }>();

const tabs = useTabs();
const active = computed(() => tabs.value.value === props.value);
</script>

<template>
  <div
    v-if="active"
    role="tabpanel"
    tabindex="0"
    data-slot="tabs-content"
    data-state="active"
    :id="tabs.panelId(value)"
    :aria-labelledby="tabs.triggerId(value)"
    :class="cn('flex-1 outline-none', props.class)"
  >
    <slot />
  </div>
</template>
