<script setup lang="ts">
import { GeocodingInput } from "@chelone/vue/maps/osm";
import PreviewPlaceForm from "@/PreviewPlaceForm.vue";
</script>

<template>
  <!-- `<GeocodingInput>` searches an address and writes the pick to `address`, `lat`, `lng` and `bbox`. -->
  <PreviewPlaceForm>
    <GeocodingInput
      source="address"
      lat-source="lat"
      lng-source="lng"
      bbox-source="bbox"
    />
  </PreviewPlaceForm>
</template>
