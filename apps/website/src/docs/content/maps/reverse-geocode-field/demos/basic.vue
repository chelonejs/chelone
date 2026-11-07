<script setup lang="ts">
import { ReverseGeocodeField } from "@chelone/vue/maps/osm";
import PreviewMaps from "@/PreviewMaps.vue";
import { previewPlace } from "@/preview-place";
</script>

<template>
  <!-- `<ReverseGeocodeField>` asks the geocoder for the address at the place's `lat` and `lng`. -->
  <PreviewMaps>
    <ReverseGeocodeField
      lat-source="lat"
      lng-source="lng"
      :record="previewPlace"
    />
  </PreviewMaps>
</template>
