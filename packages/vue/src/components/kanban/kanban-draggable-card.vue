<script setup lang="ts">
/**
 * One card of `<KanbanBoard>`: the element dnd-kit drags. A component of its
 * own because `useDraggable` registers per instance. Attributes and listeners
 * fall through to the root, so the board keeps the card's markup.
 */

import { useDraggable } from "@dnd-kit/vue";
import { ref } from "vue";

const props = defineProps<{
  /** The record id; the drag's source id. */
  id: string;
  /** False when the user may not edit: the card is no drag source then. */
  draggable: boolean;
}>();

const element = ref<HTMLElement>();
const { isDragging } = useDraggable({
  id: () => props.id,
  element,
  disabled: () => !props.draggable,
});
</script>

<template>
  <div
    ref="element"
    :data-dragging="isDragging ? '' : undefined"
    :data-draggable="draggable ? '' : undefined"
  >
    <slot />
  </div>
</template>
