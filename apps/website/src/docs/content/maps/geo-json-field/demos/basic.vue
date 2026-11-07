<script setup lang="ts">
import { GeoJsonField } from "@chelone/vue/maps";
import PreviewMaps from "@/PreviewMaps.vue";
import { previewPlace } from "@/preview-place";
</script>

<template>
  <!-- `<GeoJsonField>` draws the place's `area` polygon and zooms the map to fit it. -->
  <PreviewMaps>
    <GeoJsonField
      source="area"
      :record="previewPlace"
      class="w-full max-w-xl"
    />
  </PreviewMaps>
</template>
