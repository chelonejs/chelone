<script setup lang="ts">
import { PolygonInput } from "@chelone/vue/maps/draw";
import { OsmFeatureOperator } from "@chelone/vue/maps/osm";
import PreviewPlaceForm from "@/PreviewPlaceForm.vue";
</script>

<template>
  <!-- `<OsmFeatureOperator>` with `mode="subtract"` cuts the water the Overpass service finds out of the delivery zone. -->
  <PreviewPlaceForm>
    <PolygonInput source="zone" label="Delivery zone" />
    <OsmFeatureOperator
      source="zone"
      mode="subtract"
      :presets="['water']"
      label="Remove water from the zone"
    />
  </PreviewPlaceForm>
</template>
