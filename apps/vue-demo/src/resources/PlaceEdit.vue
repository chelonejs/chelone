<script setup lang="ts">
/**
 * `<PlaceEdit>` — the place edit page, the Vue twin of `apps/demo`'s
 * `PlaceEdit`: `MapWithSearch` finds the place, then the shared
 * `<PlaceInputs>` shapes follow.
 */

import { EditLive, TextInput, Toolbar } from "@chelone/vue";
import { MapWithSearch } from "@chelone/vue/maps/osm";
import PlaceInputs from "./PlaceInputs.vue";
</script>

<template>
  <EditLive resource="places">
    <PlaceInputs>
      <TextInput source="name" />
      <MapWithSearch
        lat-source="lat"
        lng-source="lng"
        address-source="address"
      />
    </PlaceInputs>
    <Toolbar />
  </EditLive>
</template>
