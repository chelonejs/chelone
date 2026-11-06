<script setup lang="ts">
/** The view of the callout block: a bordered box of blocks, tinted by `variant`. */

import { cn } from "../../lib/utils";
import { NodeViewContent } from "./block-nodes";
import type { CalloutAttrs } from "./default-blocks";

defineProps<{
  attrs: CalloutAttrs;
  mode: "edit" | "read";
  selected?: boolean;
  updateAttrs?: (attrs: Partial<CalloutAttrs>) => void;
}>();

const variantClass = {
  info: "border-blue-500/50 bg-blue-500/10",
  warning: "border-amber-500/50 bg-amber-500/10",
  success: "border-green-500/50 bg-green-500/10",
};
</script>

<template>
  <div
    :data-variant="attrs.variant"
    :class="cn('my-2 rounded-md border p-3', variantClass[attrs.variant])"
  >
    <NodeViewContent />
  </div>
</template>
