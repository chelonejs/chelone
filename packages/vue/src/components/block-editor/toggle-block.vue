<script setup lang="ts">
/**
 * The view of the toggle block: a summary line over blocks that a reader
 * opens and closes. The editor always shows them.
 */

import { computed, ref } from "vue";
import { cn } from "../../lib/utils";
import { ChevronRightIcon } from "./block-icons";
import { NodeViewContent } from "./block-nodes";
import type { ToggleAttrs } from "./default-blocks";

const props = defineProps<{
  attrs: ToggleAttrs;
  mode: "edit" | "read";
  selected?: boolean;
  updateAttrs?: (attrs: Partial<ToggleAttrs>) => void;
}>();

// A reader opens a toggle for themselves; the document keeps its own `open`.
const readerOpen = ref(props.attrs.open);
const editing = computed(() => props.mode === "edit");
const open = computed(() => editing.value || readerOpen.value);

function toggle() {
  if (!editing.value) readerOpen.value = !readerOpen.value;
}
</script>

<template>
  <div class="my-2">
    <button
      type="button"
      :aria-expanded="open"
      class="flex items-center gap-1 font-medium"
      @click="toggle"
    >
      <ChevronRightIcon :class="cn('size-4 transition-transform', open && 'rotate-90')" />
      <span>{{ attrs.summary }}</span>
    </button>
    <div :hidden="!open" class="pl-5">
      <NodeViewContent />
    </div>
  </div>
</template>
