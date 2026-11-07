<script setup lang="ts">
/**
 * `<PlaceEdit>` — the place edit page, showing the maps add-on through the
 * shared `<PlaceInputs>` form.
 */

import { EditLive, Toolbar } from "@chelone/vue";
import PlaceInputs from "./PlaceInputs.vue";
</script>

<template>
  <EditLive resource="places">
    <PlaceInputs />
    <Toolbar />
  </EditLive>
</template>
