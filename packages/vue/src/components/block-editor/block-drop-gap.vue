<script setup lang="ts">
/**
 * A drop target between two blocks, or before the first or after the last, for
 * `<BlockDragHandle>`. It runs from the middle of one block to the middle of
 * the next, so the pointer is always over the nearest gap. A component of its
 * own because `useDroppable` registers per instance.
 */

import { useDroppable } from "@dnd-kit/vue";
import { ref } from "vue";

const props = defineProps<{
  /** The drop target's id. */
  id: string;
  start: number;
  end: number;
  /** Where the drop line sits, from the top of the layer. */
  line: number;
}>();

const element = ref<HTMLElement>();
const { isDropTarget } = useDroppable({ id: () => props.id, element });
</script>

<template>
  <div
    ref="element"
    data-slot="block-drop-gap"
    class="pointer-events-none absolute inset-x-0"
    :style="{ top: `${start}px`, height: `${end - start}px` }"
  >
    <div
      v-if="isDropTarget"
      data-slot="block-drop-indicator"
      class="absolute inset-x-0 h-0.5 -translate-y-1/2 rounded-full bg-primary"
      :style="{ top: `${line - start}px` }"
    />
  </div>
</template>
