<script lang="ts">
/** Props for {@link TopToolbar}. */
export interface TopToolbarProps {
  /** Extra class merged onto the toolbar div. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<TopToolbar>` — the row of view actions to put in `<List>`'s `#actions`
 * slot. The Vue twin of `@chelone/react`'s `layout/top-toolbar.tsx`.
 */

import { cn } from "../../../lib/utils";

const props = defineProps<TopToolbarProps>();
</script>

<template>
  <div :class="cn('flex items-center justify-end gap-2 mb-2', props.class)">
    <slot />
  </div>
</template>
