<script setup lang="ts">
/**
 * One column's card area in `<KanbanBoard>`: a dnd-kit drop target whose id is
 * the column id. A component of its own because `useDroppable` registers per
 * instance.
 */

import { useDroppable } from "@dnd-kit/vue";
import { ref } from "vue";

const props = defineProps<{ columnId: string }>();

const element = ref<HTMLElement>();
const { isDropTarget } = useDroppable({
  id: () => props.columnId,
  element,
});
</script>

<template>
  <div
    ref="element"
    :data-over="isDropTarget ? '' : undefined"
  >
    <slot />
  </div>
</template>
