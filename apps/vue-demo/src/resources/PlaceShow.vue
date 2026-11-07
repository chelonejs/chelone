<script setup lang="ts">
/**
 * `<PlaceShow>` — the read-only place page, the Vue twin of `apps/demo`'s
 * `PlaceShow`: the maps display fields (`maps`, `maps/osm`) inside labeled
 * `<RecordField>`s. The services come from the `<MapsProvider>` in `App.vue`.
 */

import { RecordField, Show } from "@chelone/vue";
import { GeoJsonField, LatLngField } from "@chelone/vue/maps";
import { ReverseGeocodeField } from "@chelone/vue/maps/osm";
</script>

<template>
  <Show resource="places">
    <div class="flex flex-col gap-4 max-w-xl">
      <RecordField source="name" />
      <RecordField label="Location">
        <LatLngField lat-source="lat" lng-source="lng" />
      </RecordField>
      <RecordField label="Address">
        <ReverseGeocodeField lat-source="lat" lng-source="lng" />
      </RecordField>
      <RecordField label="Area">
        <GeoJsonField source="area" />
      </RecordField>
      <RecordField label="Route">
        <GeoJsonField source="route" />
      </RecordField>
    </div>
  </Show>
</template>
