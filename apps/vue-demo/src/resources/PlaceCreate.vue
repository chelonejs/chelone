<script setup lang="ts">
/**
 * `<PlaceCreate>` — the place create page, the Vue twin of `apps/demo`'s
 * `PlaceCreate`: a new place starts from an address. The search fills the
 * address, the coordinates and the box, and the pin fine-tunes them, then the
 * shared `<PlaceInputs>` shapes follow.
 */

import { Create, TextInput, Toolbar } from "@chelone/vue";
import { LatLngInput } from "@chelone/vue/maps";
import { GeocodingInput } from "@chelone/vue/maps/osm";
import PlaceInputs from "./PlaceInputs.vue";
</script>

<template>
  <Create resource="places">
    <PlaceInputs>
      <TextInput source="name" />
      <GeocodingInput
        source="address"
        lat-source="lat"
        lng-source="lng"
        bbox-source="bbox"
      />
      <LatLngInput lat-source="lat" lng-source="lng" />
    </PlaceInputs>
    <template #toolbar>
      <Toolbar />
    </template>
  </Create>
</template>
