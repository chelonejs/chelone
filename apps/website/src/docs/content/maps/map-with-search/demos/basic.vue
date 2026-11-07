<script setup lang="ts">
import { MapWithSearch } from "@chelone/vue/maps/osm";
import PreviewPlaceForm from "@/PreviewPlaceForm.vue";
</script>

<template>
  <!-- `<MapWithSearch>` finds an address, or reads one off a click on the map, and keeps the pin on it. -->
  <PreviewPlaceForm>
    <MapWithSearch
      lat-source="lat"
      lng-source="lng"
      address-source="address"
    />
  </PreviewPlaceForm>
</template>
