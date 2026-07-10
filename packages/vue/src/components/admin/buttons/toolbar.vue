<script setup lang="ts">
/**
 * `<Toolbar>` — the default action bar at the bottom of Edit/Create forms, the
 * Vue analog of `@chelone/react`'s `form/toolbar.tsx`. With no default slot it
 * renders a `<SaveButton>` (the delete button is a later wave); pass slot
 * content to replace it.
 */

import { useSlots } from "vue";
import { cn } from "../../../lib/utils";
import SaveButton from "./save-button.vue";

const props = defineProps<{ class?: string }>();
const slots = useSlots();
const hasContent = () => slots.default != null;
</script>

<template>
  <div
    role="toolbar"
    :class="cn('sticky bottom-0 pt-4 pb-4', props.class)"
    data-slot="toolbar"
  >
    <slot v-if="hasContent()" />
    <div v-else class="flex flex-row gap-2 justify-between">
      <SaveButton />
    </div>
  </div>
</template>
