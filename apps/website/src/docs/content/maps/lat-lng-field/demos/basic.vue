<script setup lang="ts">
import { LatLngField } from "@chelone/vue/maps";
import PreviewMaps from "@/PreviewMaps.vue";
import { previewPlace } from "@/preview-place";
</script>

<template>
  <!-- `<LatLngField>` puts a marker on the map where the place's `lat` and `lng` say. -->
  <PreviewMaps>
    <LatLngField lat-source="lat" lng-source="lng" :record="previewPlace" />
  </PreviewMaps>
</template>
