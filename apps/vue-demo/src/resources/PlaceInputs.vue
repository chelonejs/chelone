<script setup lang="ts">
/**
 * The place form, shared by `<PlaceEdit>` and `<PlaceCreate>` (the Vue twin of
 * `placeInputs` in `apps/demo`): `MapWithSearch` and the OpenStreetMap
 * subtract/add buttons (`maps/osm`) and the drawing inputs (`maps/draw`). The
 * services come from the `<MapsProvider>` in `App.vue`.
 */

import { TextInput } from "@chelone/vue";
import {
  BBoxInput,
  LineStringInput,
  PolygonInput,
} from "@chelone/vue/maps/draw";
import {
  MapWithSearch,
  OsmFeatureAdd,
  OsmFeatureSubtract,
} from "@chelone/vue/maps/osm";
</script>

<template>
  <div class="flex flex-col gap-4 max-w-xl">
    <TextInput source="name" />
    <MapWithSearch lat-source="lat" lng-source="lng" address-source="address" />
    <PolygonInput source="area" label="Area" />
    <div class="flex gap-2">
      <OsmFeatureSubtract source="area" :presets="['water']" />
      <OsmFeatureAdd source="area" :presets="['buildings']" />
    </div>
    <LineStringInput source="route" label="Route" snap-to-roads />
    <BBoxInput source="bbox" label="Bounding box" />
  </div>
</template>
