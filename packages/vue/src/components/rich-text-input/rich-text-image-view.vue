<script setup lang="ts">
import { uploadStateOf, isSafeImageSrc } from "@chelone/core";
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { computed, onScopeDispose, ref } from "vue";

const props = defineProps(nodeViewProps);
const revision = ref(0);
const uploads = uploadStateOf(props.editor);
const refresh = () => { revision.value++; };
uploads.listeners.add(refresh);
onScopeDispose(() => uploads.listeners.delete(refresh));
const uploading = computed(() => {
  void revision.value;
  return uploads.pending.has(props.node.attrs.src);
});
const src = computed(() => typeof props.node.attrs.src === "string" && isSafeImageSrc(props.node.attrs.src, { allowDataImages: true }) ? props.node.attrs.src : null);
</script>

<template>
  <NodeViewWrapper data-slot="rich-text-image">
    <img v-if="src" :src="src" :alt="node.attrs.alt ?? ''" />
    <div v-if="uploading" role="status" aria-label="Uploading image">Uploading image</div>
  </NodeViewWrapper>
</template>
