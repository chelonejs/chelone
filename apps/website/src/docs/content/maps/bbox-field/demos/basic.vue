<script setup lang="ts">
import { BBoxField } from "@chelone/vue/maps";
import PreviewMaps from "@/PreviewMaps.vue";
import { previewPlace } from "@/preview-place";
</script>

<template>
  <!-- `<BBoxField>` draws the place's `[west, south, east, north]` box as a rectangle. -->
  <PreviewMaps>
    <BBoxField source="bbox" :record="previewPlace" class="w-full max-w-xl" />
  </PreviewMaps>
</template>
