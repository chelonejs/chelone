<script setup lang="ts">
import { LatLngInput } from "@chelone/vue/maps";
import PreviewPlaceForm from "@/PreviewPlaceForm.vue";
</script>

<template>
  <!-- `<LatLngInput>` edits the place's `lat` and `lng` by typing them or by clicking the map. -->
  <PreviewPlaceForm>
    <LatLngInput lat-source="lat" lng-source="lng" label="Location" />
  </PreviewPlaceForm>
</template>
